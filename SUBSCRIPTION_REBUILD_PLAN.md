# Subscription System Rebuild — Complete Plan

## Executive Summary

The current subscription system has **5 independent code paths** that can modify subscription status, leading to cascading deactivation bugs. This plan replaces the entire system with a **single-source-of-truth, state-machine-driven architecture** following enterprise patterns (Stripe, Paddle, RevenueCat).

### Core Principles
1. **Single Source of Truth** — Supabase `profiles` table is the ONLY place subscription state lives
2. **Webhook-First** — Dodo webhooks are the ONLY way subscriptions get activated/renewed/cancelled
3. **State Machine** — Explicit valid transitions; invalid transitions are rejected and logged
4. **Idempotency** — Every webhook can be safely replayed without side effects
5. **No Cron Overrides** — Crons only handle expiry/cleanup, NEVER override webhook-set states
6. **Audit Everything** — Every state change is logged with before/after snapshots

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                    DODO PAYMENTS                      │
│                  (Payment Provider)                   │
└────────────────────┬─────────────────────────────────┘
                     │ Webhooks (HMAC-SHA256 signed)
                     ▼
┌──────────────────────────────────────────────────────┐
│              CONVEX HTTP ENDPOINT                     │
│              /dodoWebhook                             │
│                                                       │
│  1. Verify signature                                  │
│  2. Deduplicate (webhook_id check)                   │
│  3. Parse event → extract subscription data           │
│  4. Resolve user (email → userId)                    │
│  5. Apply state machine transition                    │
│  6. Write to Supabase via RPC                         │
│  7. Record webhook processed                          │
│  8. Send notification email                           │
└──────────────────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────┐
│              SUPABASE (Source of Truth)                │
│                                                       │
│  profiles table:                                      │
│    subscription_status  (state machine value)         │
│    subscription_plan    ('Professional')               │
│    subscription_end_date (when access expires)        │
│    billing_cycle        ('monthly'|'yearly')          │
│    dodo_customer_id     (provider link)               │
│    dodo_subscription_id (subscription link)           │
│                                                       │
│  subscription_audit_log table:                        │
│    Every transition logged with full context           │
│                                                       │
│  payments table:                                      │
│    Payment records (amounts in cents, always USD)     │
└──────────────────────────────────────────────────────┘
                     │
                     ▼ Realtime subscription
┌──────────────────────────────────────────────────────┐
│              FRONTEND (React)                         │
│                                                       │
│  AuthContext listens to profiles changes              │
│  hasActiveAccess() gates premium features             │
│  No direct subscription writes from client            │
└──────────────────────────────────────────────────────┘
```

---

## Phase 1: Database Cleanup & Schema

### 1.1 Drop Dangerous Trigger
```sql
-- MUST BE RUN FIRST in Supabase SQL Editor
DROP TRIGGER IF EXISTS trigger_auto_expire_subscriptions ON profiles;
DROP FUNCTION IF EXISTS auto_expire_subscriptions();
```

### 1.2 Clean Up Profiles Table
Keep these subscription columns (rename/add as needed):
| Column | Type | Purpose |
|--------|------|---------|
| `subscription_status` | text | State machine value |
| `subscription_plan` | text | Plan name (e.g. 'Professional') |
| `subscription_end_date` | timestamptz | When current period ends |
| `billing_cycle` | text | 'monthly' or 'yearly' |
| `dodo_customer_id` | text | Dodo customer ID |
| `dodo_subscription_id` | text | **NEW** — Dodo subscription ID for direct lookups |
| `trial_started_at` | timestamptz | When trial started |
| `trial_ends_at` | timestamptz | When trial ends (14 days) |
| `trial_activated` | boolean | Whether trial was ever used |
| `last_reminder_sent_at` | timestamptz | Email rate-limiting |
| `email_notifications_enabled` | boolean | Email opt-out |

**Remove**: `trial_grace_ends_at` — grace period will be calculated, not stored.

### 1.3 Fix Audit Log Table
```sql
-- Drop and recreate with clean schema
DROP TABLE IF EXISTS subscription_audit_log;
CREATE TABLE subscription_audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN (
    'activate', 'renew', 'cancel', 'expire', 
    'payment_failed', 'trial_start', 'trial_expire',
    'reactivate', 'admin_extend', 'admin_cancel'
  )),
  old_status text,
  new_status text,
  old_end_date timestamptz,
  new_end_date timestamptz,
  plan text,
  billing_cycle text,
  source text NOT NULL CHECK (source IN (
    'webhook', 'cron', 'admin', 'trial_system', 'user_action'
  )),
  dodo_subscription_id text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_audit_user ON subscription_audit_log(user_id, created_at DESC);
CREATE INDEX idx_audit_action ON subscription_audit_log(action, created_at DESC);
```

### 1.4 Replace RPC Functions
```sql
-- Single atomic subscription state transition function
CREATE OR REPLACE FUNCTION transition_subscription(
  p_user_id uuid,
  p_new_status text,
  p_end_date timestamptz DEFAULT NULL,
  p_plan text DEFAULT NULL,
  p_billing_cycle text DEFAULT NULL,
  p_dodo_customer_id text DEFAULT NULL,
  p_dodo_subscription_id text DEFAULT NULL,
  p_source text DEFAULT 'webhook',
  p_metadata jsonb DEFAULT '{}'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_status text;
  v_old_end_date timestamptz;
  v_result jsonb;
BEGIN
  -- Row-level lock to prevent concurrent modifications
  SELECT subscription_status, subscription_end_date
  INTO v_old_status, v_old_end_date
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Validate state transition (state machine enforced here)
  IF NOT is_valid_transition(COALESCE(v_old_status, 'none'), p_new_status) THEN
    -- Log rejected transition for debugging
    INSERT INTO subscription_audit_log 
      (user_id, action, old_status, new_status, source, metadata)
    VALUES 
      (p_user_id, 'rejected_transition', v_old_status, p_new_status, p_source, 
       p_metadata || jsonb_build_object('reason', 'invalid_transition'));
    
    RETURN jsonb_build_object(
      'success', false, 
      'error', format('Invalid transition: %s → %s', COALESCE(v_old_status, 'none'), p_new_status)
    );
  END IF;

  -- Apply the transition
  UPDATE profiles SET
    subscription_status = p_new_status,
    subscription_end_date = COALESCE(p_end_date, subscription_end_date),
    subscription_plan = COALESCE(p_plan, subscription_plan),
    billing_cycle = COALESCE(p_billing_cycle, billing_cycle),
    dodo_customer_id = COALESCE(p_dodo_customer_id, dodo_customer_id),
    dodo_subscription_id = COALESCE(p_dodo_subscription_id, dodo_subscription_id),
    updated_at = now()
  WHERE id = p_user_id;

  -- Audit log
  INSERT INTO subscription_audit_log 
    (user_id, action, old_status, new_status, old_end_date, new_end_date, 
     plan, billing_cycle, source, dodo_subscription_id, metadata)
  VALUES 
    (p_user_id, p_new_status, v_old_status, p_new_status, v_old_end_date,
     COALESCE(p_end_date, v_old_end_date), 
     COALESCE(p_plan, 'Professional'), p_billing_cycle, p_source,
     p_dodo_subscription_id, p_metadata);

  RETURN jsonb_build_object(
    'success', true,
    'old_status', v_old_status,
    'new_status', p_new_status,
    'old_end_date', v_old_end_date,
    'new_end_date', COALESCE(p_end_date, v_old_end_date)
  );
END;
$$;

-- State machine validation function
CREATE OR REPLACE FUNCTION is_valid_transition(p_from text, p_to text)
RETURNS boolean
LANGUAGE plpgsql IMMUTABLE
AS $$
BEGIN
  RETURN CASE
    -- From no subscription (new user or null status)
    WHEN p_from IN ('none', '') AND p_to IN ('active', 'trialing') THEN true
    -- From trialing
    WHEN p_from = 'trialing' AND p_to IN ('active', 'expired') THEN true
    -- From active (current subscription)
    WHEN p_from = 'active' AND p_to IN ('active', 'cancelled', 'expired', 'payment_failed') THEN true
    -- From payment_failed (retry or cancel)
    WHEN p_from = 'payment_failed' AND p_to IN ('active', 'cancelled', 'expired') THEN true
    -- From cancelled (reactivation possible)
    WHEN p_from = 'cancelled' AND p_to IN ('active', 'expired') THEN true
    -- From expired (resubscribe)
    WHEN p_from = 'expired' AND p_to IN ('active', 'trialing') THEN true
    -- active → active is always valid (renewals)
    ELSE false
  END;
END;
$$;
```

### 1.5 Drop Old Functions
```sql
DROP FUNCTION IF EXISTS extend_subscription(uuid, uuid, integer, text, text);
DROP FUNCTION IF EXISTS cancel_subscription(uuid, uuid, text);
DROP FUNCTION IF EXISTS activate_trial(uuid);
DROP FUNCTION IF EXISTS check_trial_eligibility(uuid);
```

### 1.6 Create New Trial Function
```sql
CREATE OR REPLACE FUNCTION activate_trial(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile RECORD;
  v_trial_end timestamptz;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Check eligibility
  IF v_profile.trial_activated = true THEN
    RETURN jsonb_build_object('success', false, 'error', 'Trial already used');
  END IF;

  IF v_profile.subscription_status IN ('active', 'trialing') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already has active subscription');
  END IF;

  -- Check if user ever had a paid subscription
  IF EXISTS (SELECT 1 FROM payments WHERE user_id = p_user_id AND status = 'completed') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Previous subscriber cannot trial');
  END IF;

  v_trial_end := now() + interval '14 days';

  UPDATE profiles SET
    subscription_status = 'trialing',
    subscription_plan = 'Professional',
    subscription_end_date = v_trial_end,
    trial_started_at = now(),
    trial_ends_at = v_trial_end,
    trial_activated = true,
    updated_at = now()
  WHERE id = p_user_id;

  -- Audit log
  INSERT INTO subscription_audit_log 
    (user_id, action, old_status, new_status, new_end_date, plan, source)
  VALUES 
    (p_user_id, 'trial_start', v_profile.subscription_status, 'trialing', 
     v_trial_end, 'Professional', 'trial_system');

  RETURN jsonb_build_object(
    'success', true,
    'trial_ends_at', v_trial_end
  );
END;
$$;
```

---

## Phase 2: Convex Backend — Complete Rewrite

### 2.1 New File Structure
```
frontend/convex/
├── subscription/
│   ├── webhook.ts          # Webhook handler (HTTP endpoint)
│   ├── actions.ts          # Subscription actions (activate, cancel, sync)  
│   ├── queries.ts          # Frontend-facing queries
│   ├── crons.ts            # Cron handlers (expiry check only)
│   ├── stateMachine.ts     # State transition validation
│   ├── dodoApi.ts          # Dodo Payments API client
│   └── types.ts            # Shared types
├── webhookHelpers.ts       # (Keep — deduplication logic)
├── schema.ts               # (Update — simplify subscription tables)
├── crons.ts                # (Update — remove reconciliation cron)
└── http.ts                 # (Rewrite — clean webhook route)
```

### 2.2 State Machine (`subscription/stateMachine.ts`)
```typescript
export type SubscriptionStatus = 
  | 'active' 
  | 'trialing' 
  | 'payment_failed' 
  | 'cancelled' 
  | 'expired' 
  | null;

// Valid state transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  'none':           ['active', 'trialing'],
  'trialing':       ['active', 'expired'],
  'active':         ['active', 'cancelled', 'expired', 'payment_failed'],
  'payment_failed': ['active', 'cancelled', 'expired'],
  'cancelled':      ['active', 'expired'],
  'expired':        ['active', 'trialing'],
};

export function isValidTransition(from: string | null, to: string): boolean {
  const key = from || 'none';
  return VALID_TRANSITIONS[key]?.includes(to) ?? false;
}

// Map Dodo webhook events to target status
export function eventToStatus(eventType: string): SubscriptionStatus | null {
  switch (eventType) {
    case 'subscription.active':
    case 'subscription.renewed':
      return 'active';
    case 'subscription.cancelled':
    case 'subscription.canceled':
      return 'cancelled';
    case 'subscription.on_hold':
    case 'subscription.failed':
    case 'subscription.payment_failed':
      return 'payment_failed';
    case 'subscription.expired':
      return 'expired';
    default:
      return null; // Unknown event — log but don't act
  }
}
```

### 2.3 Dodo API Client (`subscription/dodoApi.ts`)
```typescript
// Clean Dodo API wrapper — no business logic, just API calls
const DODO_API = 'https://api.dodopayments.com';

export async function fetchSubscription(subscriptionId: string): Promise<DodoSubscription> { ... }
export async function listSubscriptions(customerId: string): Promise<DodoSubscription[]> { ... }
export async function createCheckoutSession(params: CheckoutParams): Promise<CheckoutSession> { ... }
export async function createPortalSession(customerId: string): Promise<PortalSession> { ... }
export async function fetchPayment(paymentId: string): Promise<DodoPayment> { ... }
```

### 2.4 Webhook Handler (`subscription/webhook.ts`) — The Core
This is the ONLY file that activates/deactivates subscriptions (besides cron expiry).

```
Webhook Flow:
1. Verify HMAC signature
2. Check idempotency (webhook_id already processed?)
3. Parse event type → map to target status via state machine
4. Extract: subscriptionId, customerId, customerEmail, billingCycle, endDate
5. Resolve user: email → Supabase lookup
6. Call transition_subscription() RPC (atomic, audited)
7. Record webhook as processed
8. Send email notification (async, non-blocking)
9. Return 200 OK
```

Key design decisions:
- **NO live API fetch** — use webhook payload data directly (Dodo sends full subscription object in webhook)
- **NO fallback chains** — if user can't be resolved by email, log to `failed_activations` for admin
- **Idempotent** — same webhook replayed = same result (RPC is idempotent for same status)
- **Fast response** — return 200 immediately, send email in background

### 2.5 Subscription Actions (`subscription/actions.ts`)
```
Functions:
- createCheckout(userId, billingCycle) → Dodo checkout URL
- createPortalSession(userId) → Dodo portal URL  
- verifyPayment(userId, paymentId) → direct API verification (fallback only)
- syncFromProvider(userId) → on-demand sync (login only, rate-limited to 1/hour)
```

### 2.6 Cron Handlers (`subscription/crons.ts`)
```
Only TWO subscription crons (down from 3):

1. checkExpirations (every 6 hours)
   - Find profiles where subscription_end_date < NOW() AND status IN ('active','payment_failed')
   - ONLY expire if end_date is MORE THAN 24 hours in the past (grace window for webhook delays)
   - Call transition_subscription() RPC
   - Send expiry email

2. checkTrialExpirations (every 6 hours)  
   - Find profiles where trial_ends_at < NOW() AND status = 'trialing'
   - Call transition_subscription(status='expired')
   - Send trial expired email

REMOVED: reconcileSubscriptionsFromDodo (15-minute bulk sync)
  — This was the #1 source of deactivation bugs
  — Webhooks + login sync are sufficient
  — If a webhook is truly missed, admin can manually trigger sync from admin panel
```

### 2.7 Schema Changes (`schema.ts`)
```typescript
// REMOVE subscriptionSync table (no longer needed — no reconciliation)
// KEEP webhookEvents table (deduplication)
// KEEP jobsMeta table (cron tracking)
// ADD failedWebhooks table for admin recovery
```

---

## Phase 3: HTTP Routes Rewrite (`http.ts`)

### Current: 1,146 lines of tangled routes
### Target: ~300 lines, clean separation

```
Routes to KEEP (rewritten):
  POST /dodoWebhook          → subscription/webhook.ts handler
  POST /createDodoPayment    → subscription/actions.ts createCheckout
  POST /dodoPortalSession    → subscription/actions.ts createPortalSession
  POST /verifyDodoPayment    → subscription/actions.ts verifyPayment
  POST /syncDodoSubscription → subscription/actions.ts syncFromProvider

Routes to REMOVE:
  - All PaySky/Kashier routes (legacy, unused)
  - Any duplicate/experimental routes
```

---

## Phase 4: Frontend Changes

### 4.1 AuthContext Simplification
```
Current: 414 lines with complex sync logic
Target: ~200 lines

Changes:
- Remove syncDodoSubscription call on every login (rely on webhooks)
- Keep realtime listener for profiles table  
- Keep toast notifications for status changes
- Remove PaySky/Kashier references
- Simplify hasActiveAccess check (already clean)
```

### 4.2 Pages to Clean Up
| Page | Action |
|------|--------|
| Checkout.tsx | Keep, remove legacy provider code |
| CheckoutInline.tsx | **DELETE** — experimental, broken auth |
| PaymentCallback.tsx | Simplify, remove legacy provider handlers |
| PaymentHistory.tsx | Keep as-is |
| PaymentTest.tsx | **DELETE** or add admin-only guard |
| Settings.tsx | Keep, clean up legacy references |
| Dashboard.tsx | Keep, verify `hasActiveAccess()` usage |

### 4.3 Components to Clean Up
| Component | Action |
|-----------|--------|
| PaymentFailedBanner.tsx | Keep |
| TrialBanner.tsx | Keep |
| GracePeriodBanner.tsx | Keep (calculate grace from end_date + 3 days) |
| DodoInlineCheckout.tsx | **DELETE** (inline checkout removed) |
| OrderSummary.tsx | **DELETE** (inline checkout removed) |
| PlanSelector.tsx | **DELETE** (inline checkout removed) |
| BillingCycleToggle.tsx | **DELETE** (inline checkout removed) |

### 4.4 Libraries to Remove
| File | Action |
|------|--------|
| paysky.ts | **DELETE** — legacy, contains hardcoded secrets |
| kashier.ts | **DELETE** — legacy |
| paymentPoller.ts | **DELETE** — replaced by realtime |
| dodoPortal.ts | Keep |
| subscriptionUtils.ts | Keep (already clean) |

### 4.5 Hooks
| Hook | Action |
|------|--------|
| usePaymentVerification.ts | Simplify — single Dodo verify call, no polling |
| useCurrency.ts | Keep |

---

## Phase 5: Supabase Edge Functions

### Keep:
- `send-payment-email/index.ts` — Clean up, consolidate templates
- `generate-invoice/index.ts` — Keep as-is

### Delete:
- `check-expiring-subscriptions/index.ts` — **DELETE** (duplicated by Convex cron)
- `update-payment-status/index.ts` — **DELETE** (legacy admin tool)
- `kashier-webhook/index.ts` — **DELETE** (legacy)
- `paysky-webhook/index.ts` — **DELETE** (legacy)

---

## Phase 6: Security Hardening

### 6.1 RLS Policies
```sql
-- Clients can NEVER set subscription_status to 'active' or 'trialing'
-- Only server-side RPC (SECURITY DEFINER) can activate subscriptions
-- Keep existing policy from fix migration, verify it's active

-- Verify:
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

### 6.2 Webhook Signature Verification
```
Current: 3 key formats, 2 encoding strategies (overly complex)
Target: 1 key, 1 encoding (whatever Dodo actually uses)

Steps:
1. Log the actual webhook-signature format from Dodo
2. Implement ONLY that format
3. Reject all others
```

### 6.3 Remove Hardcoded Secrets
- Delete PaySky MID/TID/SecretKey from `paysky.ts` (delete entire file)
- Delete Kashier keys from `kashier.ts` (delete entire file)
- Verify all Dodo API keys are in environment variables only

---

## Implementation Sequence

### Step 1: Database (30 min)
1. Drop `trigger_auto_expire_subscriptions`
2. Add `dodo_subscription_id` column to profiles
3. Recreate `subscription_audit_log` with clean schema
4. Create `transition_subscription()` and `is_valid_transition()` RPC functions
5. Create new `activate_trial()` function
6. Drop old RPC functions (`extend_subscription`, `cancel_subscription`, old `activate_trial`)

### Step 2: Convex Backend Rewrite (2-3 hours)
1. Create `subscription/` folder with new files
2. Rewrite webhook handler — clean, linear, no nested fallbacks
3. Rewrite subscription actions (checkout, portal, verify, sync)
4. Rewrite cron handlers (only expiry checks, no reconciliation)
5. Update `http.ts` to use new handlers
6. Update `schema.ts` (remove subscriptionSync, keep webhookEvents)
7. Update `crons.ts` (remove reconcile dodo cron)
8. Delete old `dodoPayments.ts` (replaced by subscription/ folder)

### Step 3: Frontend Cleanup (1-2 hours)
1. Simplify AuthContext (remove sync-on-login, keep realtime)
2. Delete legacy files (paysky.ts, kashier.ts, paymentPoller.ts, CheckoutInline.tsx, etc.)
3. Clean Checkout.tsx, PaymentCallback.tsx, Settings.tsx
4. Remove inline checkout components

### Step 4: Edge Functions Cleanup (30 min)
1. Delete legacy edge functions (kashier-webhook, paysky-webhook, check-expiring-subscriptions, update-payment-status)
2. Verify send-payment-email templates are complete

### Step 5: Testing & Deploy (1 hour)
1. Deploy Convex changes
2. Run SQL migration in Supabase
3. Test webhook flow end-to-end
4. Test checkout → payment → activation
5. Test cancellation flow
6. Test payment failure → retry → reactivation
7. Test trial activation → expiry
8. Verify admin panel still works

---

## What Gets Deleted (Cleanup)

### Files to DELETE:
- `frontend/src/lib/paysky.ts` (261 lines, hardcoded secrets)
- `frontend/src/lib/kashier.ts` (320 lines)
- `frontend/src/lib/paymentPoller.ts` (129 lines)
- `frontend/src/pages/CheckoutInline.tsx` (278 lines)
- `frontend/src/pages/PaymentTest.tsx` (414 lines)
- `frontend/src/components/checkout/DodoInlineCheckout.tsx` (160 lines)
- `frontend/src/components/checkout/OrderSummary.tsx` (159 lines)
- `frontend/src/components/checkout/PlanSelector.tsx` (95 lines)
- `frontend/src/components/checkout/BillingCycleToggle.tsx` (92 lines)
- `supabase/functions/check-expiring-subscriptions/index.ts` (209 lines)
- `supabase/functions/update-payment-status/index.ts` (134 lines)
- `supabase/functions/kashier-webhook/index.ts` (139 lines)
- `supabase/functions/paysky-webhook/index.ts` (130 lines)

**Total deleted: ~2,520 lines of dead/dangerous code**

### Files to REWRITE:
- `frontend/convex/dodoPayments.ts` → `frontend/convex/subscription/` folder (1,052 → ~500 lines)
- `frontend/convex/http.ts` (1,063 → ~300 lines)
- `frontend/convex/cronHandlers.ts` (subscription parts only)
- `frontend/convex/crons.ts` (remove reconcile cron)
- `frontend/src/context/AuthContext.tsx` (414 → ~200 lines)

### Files to CLEAN:
- `frontend/src/pages/Checkout.tsx` (remove legacy provider code)
- `frontend/src/pages/PaymentCallback.tsx` (remove legacy handlers)
- `frontend/src/pages/Settings.tsx` (remove legacy references)

---

## State Machine Diagram

```
                    ┌───────────┐
                    │   null    │ (new user, no subscription)
                    └─────┬─────┘
                          │
                ┌─────────┼─────────┐
                ▼                   ▼
         ┌──────────┐        ┌──────────┐
         │ trialing │        │  active  │◄──── renew/reactivate
         └────┬─────┘        └────┬─────┘
              │                   │
              │              ┌────┼────────────┐
              ▼              ▼    ▼             ▼
         ┌──────────┐  ┌──────────┐   ┌───────────────┐
         │ expired  │  │cancelled │   │payment_failed │
         └────┬─────┘  └────┬─────┘   └───────┬───────┘
              │              │                  │
              │              ▼                  ▼
              │         ┌──────────┐      ┌──────────┐
              ├────────►│  active  │      │  active  │ (payment retry succeeds)
              │         └──────────┘      └──────────┘
              │              │                  │
              └──────────────┼──────────────────┘
                             ▼
                        ┌──────────┐
                        │ expired  │ (end date passed)
                        └──────────┘
```

### Valid Transitions Table:
| From | To | Trigger |
|------|----|---------|
| null → active | Webhook: subscription.active | First payment |
| null → trialing | RPC: activate_trial() | Trial start |
| trialing → active | Webhook: subscription.active | Paid during trial |
| trialing → expired | Cron: trial_ends_at < NOW() | Trial ended |
| active → active | Webhook: subscription.renewed | Renewal |
| active → cancelled | Webhook: subscription.cancelled | User cancelled |
| active → payment_failed | Webhook: subscription.failed | Payment failed |
| active → expired | Cron: end_date < NOW() - 24h | Period ended |
| payment_failed → active | Webhook: subscription.active/renewed | Payment retry success |
| payment_failed → cancelled | Webhook: subscription.cancelled | Gave up |
| payment_failed → expired | Cron: end_date < NOW() - 24h | Period ended |
| cancelled → active | Webhook: subscription.active | Resubscribed |
| cancelled → expired | Cron: end_date < NOW() - 24h | Period ended |
| expired → active | Webhook: subscription.active | New subscription |
| expired → trialing | RPC: activate_trial() | Edge case: admin reset |

---

## Key Design Decisions

### 1. Why remove the reconciliation cron?
The 15-minute reconciliation (`reconcileSubscriptionsFromDodo`) was the primary source of deactivation bugs. It fetched ALL subscriptions from Dodo API and tried to sync them, but misinterpreted `cancel_at_period_end`, `end_at`, and other flags — causing active subscriptions to be cancelled.

**Replacement strategy:**
- Webhooks handle 99.9% of state changes in real-time
- On-login sync (rate-limited to 1/hour) catches the remaining 0.1%
- Admin panel provides manual sync for edge cases
- This matches how Stripe, Paddle, and RevenueCat operate

### 2. Why use a database RPC instead of direct profile updates?
- **Atomicity**: Row-level lock prevents race conditions between webhook and cron
- **Audit**: Every transition is logged automatically
- **Validation**: State machine enforced at database level (can't be bypassed)
- **Single path**: All transitions go through one function, one code path

### 3. Why keep Convex for webhooks instead of Supabase Edge Functions?
- Convex has webhook deduplication tables already in place
- Convex runs JavaScript natively (vs Deno in Supabase Edge Functions)
- The existing webhook URL is registered with Dodo — changing it requires provider reconfiguration
- Convex HTTP endpoints are already battle-tested in production

### 4. Why a 24-hour grace period before cron expiry?
- Dodo may send `subscription.renewed` webhook slightly after `subscription_end_date`
- Payment processing can take up to a few hours
- The 24-hour buffer prevents the cron from expiring a subscription that's about to be renewed
- This matches Stripe's behavior (grace period before marking past due)

---

## Success Criteria

After implementation:
1. ✅ A paid subscription STAYS active until the user cancels or payment fails
2. ✅ Renewals extend the end date without any interruption
3. ✅ Payment failures show a banner but don't immediately revoke access  
4. ✅ Cancellation takes effect at end of billing period (not immediately)
5. ✅ Trial → paid transition is seamless
6. ✅ No database triggers can override webhook-set status
7. ✅ Every state change is audited with full before/after context
8. ✅ Replaying the same webhook produces identical results
9. ✅ Legacy PaySky/Kashier code is completely removed
10. ✅ Total subscription code reduced from ~10,500 to ~3,000 lines
