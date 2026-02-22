# Durrah Exams — Subscription & Payment System: Full Analysis & Improvement Plan

> **Date:** February 19, 2026  
> **Scope:** Complete audit of the subscription system, Dodo payments integration, database schema, frontend/backend code, and a detailed plan for a robust monthly/yearly subscription system.

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Current State Audit](#2-current-state-audit)
3. [Problems Found (Categorized)](#3-problems-found-categorized)
4. [Detailed Fix & Improvement Plan](#4-detailed-fix--improvement-plan)
5. [Target Monthly/Yearly Subscription Architecture](#5-target-monthlyyearly-subscription-architecture)
6. [Database Schema Changes](#6-database-schema-changes)
7. [Backend (Convex) Changes](#7-backend-convex-changes)
8. [Frontend Changes](#8-frontend-changes)
9. [Testing Checklist](#9-testing-checklist)
10. [Implementation Priority & Timeline](#10-implementation-priority--timeline)

---

## 1. System Architecture Overview

### Current Stack

| Layer | Technology | Role |
|-------|-----------|------|
| **Frontend** | React + TypeScript + Vite | Checkout UI, subscription gating, payment callbacks |
| **Convex Backend** | Convex (serverless) | Dodo webhook processing, payment verification, cron jobs |
| **Python Backend** | FastAPI | Exam engine only — zero payment/subscription logic |
| **Node.js Backend** | Express (server.ts) | **DEAD CODE** — abandoned Kashier integration |
| **Database** | Supabase (PostgreSQL) | Source of truth for `profiles`, `payments`, subscription state |
| **Payment Provider** | Dodo Payments | **Active** — checkout, webhooks, subscription management |
| **Abandoned Providers** | Kashier, PaySky | Code still present, not functional |

### Data Flow

```
User → Checkout.tsx → POST /createDodoPayment (Convex HTTP)
         ↓
    Dodo API → Hosted checkout page → User pays
         ↓
    Two parallel paths:
    ├─ Webhook: Dodo → POST /dodoWebhook → updateSubscriptionLogic → Supabase
    └─ Direct:  PaymentCallback.tsx → POST /verifyDodoPayment → Supabase
         ↓
    Supabase profiles.subscription_status = 'active'
         ↓
    Realtime → AuthContext → UI unlocked
```

### Subscription Plans

| Plan | Billing | Product ID | Price | Duration |
|------|---------|-----------|-------|----------|
| Professional | Monthly | `pdt_0NVdvPLWrAr1Rym66kXLP` | $5/mo | 30 days |
| Professional | Yearly | `pdt_0NVdw6iZw42sQIdxctP55` | $50/yr | 365 days |
| Starter (Free) | — | None | $0 | Unlimited |

---

## 2. Current State Audit

### Files Involved in Subscription/Payment System

#### Backend (Convex — Active)
| File | Lines | Purpose |
|------|-------|---------|
| `frontend/convex/dodoPayments.ts` | ~989 | Core: checkout creation, subscription activation/cancellation, verification, reconciliation |
| `frontend/convex/http.ts` | ~974 | Webhook handler, HTTP API endpoints |
| `frontend/convex/webhookHelpers.ts` | ~144 | Webhook dedup, sync state tracking |
| `frontend/convex/cronHandlers.ts` | ~422 | Expiration checks, trial expiration, reconciliation |
| `frontend/convex/crons.ts` | ~98 | Cron schedule |
| `frontend/convex/schema.ts` | — | Convex tables: `webhookEvents`, `subscriptionSync`, `jobsMeta` |

#### Backend (Node.js — DEAD CODE)
| File | Lines | Purpose |
|------|-------|---------|
| `backend/server.ts` | 32 | Express server for Kashier — **abandoned** |
| `backend/webhook.ts` | 14 | Kashier webhook — **empty TODO** |
| `backend/kashier.ts` | 28 | Kashier checkout session — **sandbox only** |

#### Frontend
| File | Purpose |
|------|---------|
| `frontend/src/pages/Checkout.tsx` | Main checkout page (redirect flow) |
| `frontend/src/pages/CheckoutInline.tsx` | Inline checkout (iframe) — **broken** |
| `frontend/src/pages/PaymentCallback.tsx` | Post-payment verification & polling |
| `frontend/src/pages/PaymentHistory.tsx` | Payment history list |
| `frontend/src/pages/PricingPage.tsx` | Public pricing display |
| `frontend/src/pages/Settings.tsx` | Subscription management |
| `frontend/src/pages/PaymentTest.tsx` | Dev test page for Kashier/PaySky — **dead** |
| `frontend/src/components/checkout/DodoInlineCheckout.tsx` | Dodo iframe component |
| `frontend/src/components/checkout/OrderSummary.tsx` | Order details display |
| `frontend/src/components/checkout/PlanSelector.tsx` | Basic/Pro selector — **broken** |
| `frontend/src/components/checkout/BillingCycleToggle.tsx` | Monthly/Yearly toggle |
| `frontend/src/components/PaymentNotification.tsx` | Payment failed notification |
| `frontend/src/hooks/useDodoCheckout.ts` | Dodo SDK lifecycle |
| `frontend/src/hooks/usePaymentVerification.ts` | Payment verification polling |
| `frontend/src/hooks/useCurrency.ts` | Currency conversion |
| `frontend/src/lib/subscriptionUtils.ts` | `hasActiveAccess()`, `daysRemaining()` |
| `frontend/src/lib/paymentPoller.ts` | **Dead code** — unused poller |
| `frontend/src/lib/dodoPortal.ts` | Dodo customer portal |
| `frontend/src/lib/kashier.ts` | **Dead code** — Kashier integration |
| `frontend/src/lib/paysky.ts` | **Dead code** — PaySky integration |
| `frontend/src/types/dodo.ts` | TypeScript types |
| `frontend/src/config/dodoTheme.ts` | Checkout theme |
| `frontend/src/context/AuthContext.tsx` | Auth + subscription status realtime sync |

#### Database (Supabase)
| Table | Role |
|-------|------|
| `profiles` | Source of truth — `subscription_status`, `subscription_end_date`, `subscription_plan`, `dodo_customer_id`, trial columns |
| `payments` | Payment records — `user_id`, `user_email`, `amount`, `status`, `provider`, `merchant_reference`, `metadata` |

---

## 3. Problems Found (Categorized)

### 🔴 CRITICAL — Subscription Activation Failures

| # | Problem | Location | Impact |
|---|---------|----------|--------|
| C1 | **`extend_subscription` and `cancel_subscription` RPC functions have NO SQL definition in the codebase** | Missing from `supabase/migrations/` | If database is recreated, ALL subscription activation via webhooks and admin panels will fail silently. No users can be activated. |
| C2 | **User ID resolution failure = paid but not activated** | `dodoPayments.ts` `updateSubscriptionLogic` | If `metadata.userId` is lost AND email/customer-ID lookup fails, user pays but never gets activated. No alert is raised. No admin notification. |
| C3 | **`billingCycle` metadata loss → yearly subscribers get only 30 days** | `dodoPayments.ts` L516, defaults to `'monthly'` | If Dodo doesn't propagate metadata on renewal events, yearly subscribers who paid $50 only get 30 days instead of 365. |
| C4 | **Double extension risk on activation event** | `http.ts` webhook handler | Both `subscription.active` and `subscription.renewed` call `updateSubscription(active)`. When `nextBillingDate` IS provided, there's no idempotency check — the end date is PATCHed directly both times. |
| C5 | **Portal security check is dead code** — `userDodoId` is never assigned | `http.ts` L700 | The customer-mismatch prevention for the Dodo billing portal never executes. Any user could potentially open another user's portal. |
| C6 | **No `CREATE TABLE` for `profiles` or `payments` in migrations** | `supabase/migrations/` | Database cannot be reproduced from migrations alone. Fresh deployments will break. |

### 🟠 HIGH — Data Integrity & Security Issues

| # | Problem | Location | Impact |
|---|---------|----------|--------|
| H1 | **Hardcoded API keys in source control** | `backend/server.ts` (Kashier), `frontend/src/lib/kashier.ts`, `frontend/src/lib/paysky.ts` | Security vulnerability — secrets exposed in Git history |
| H2 | **Inline checkout uses wrong URL (`.cloud` instead of `.site`)** | `CheckoutInline.tsx` L83 | Inline checkout API calls likely fail silently |
| H3 | **Inline checkout sends no auth token** | `CheckoutInline.tsx` | Unlike main checkout, no `Authorization: Bearer` header — unauthenticated requests |
| H4 | **`verifyDodoPayment` endpoint is unauthenticated** | `http.ts` | Anyone can POST `{ orderId, userId }` to trigger verification for any user |
| H5 | **Inconsistent plan naming** — `'pro'` vs `'Professional'` | `dodoPayments.ts` createCheckout vs verifyPayment | `subscription_plan` column has inconsistent values |
| H6 | **Payment history fetches by email instead of user_id** | `PaymentHistory.tsx` L51 | Email changes break payment history visibility |
| H7 | **No foreign key on `payments.user_id` → `profiles.id`** | Database design | Orphaned payment records possible |
| H8 | **Webhook returns 200 even on internal activation failure** | `http.ts` | Dodo won't retry — failed activations are permanently lost |
| H9 | **No dead letter queue / alerting for failed activations** | System-wide | Failed activations are silently logged. No admin visibility. |

### 🟡 MEDIUM — Functional Issues

| # | Problem | Location | Impact |
|---|---------|----------|--------|
| M1 | **Discount percentage wrong** — PricingPage shows "SAVE 20%" but actual saving is ~16.67% | `PricingPage.tsx`, `BillingCycleToggle.tsx` | Misleading pricing communication |
| M2 | **PlanSelector shows fake "Basic" plan at $5/mo** | `PlanSelector.tsx` | Confusing UI — no Basic paid plan exists |
| M3 | **Inline checkout doesn't re-create session on billing cycle change** | `CheckoutInline.tsx` L57-59 | User stays locked to the first-selected billing cycle |
| M4 | **`paymentPoller.ts` is unused dead code** | `frontend/src/lib/paymentPoller.ts` | Dead dependency — references Kashier/PaySky |
| M5 | **`PaymentTest.tsx` page still active** | `frontend/src/pages/PaymentTest.tsx` | Dev/test page accessible in production |
| M6 | **`usePaymentVerification` has stale closure on `attempts`** | `usePaymentVerification.ts` L53 | Displayed attempt count may diverge from actual |
| M7 | **No subscription status CHECK constraint in database** | Database | Invalid values can be written (typos, etc.) |
| M8 | **Missing composite index on `(subscription_status, subscription_end_date)`** | Database | Cron queries scanning full `profiles` table |
| M9 | **Standalone SQL scripts not in migrations folder** | Project root | `add-fcm-token.sql`, `add_tutorial_column.sql`, etc. — lost on `supabase db reset` |
| M10 | **No `updated_at` trigger on `profiles`** | Database | `updated_at` may be stale |
| M11 | **Reconciliation cron fetches 300 subscriptions every 15 minutes** | `cronHandlers.ts` | Unnecessary API calls, potential rate limiting at scale |
| M12 | **Trial protection could block legitimate activation** | `dodoPayments.ts` | Out-of-order events during trial could prevent activation |
| M13 | **`PaymentCallback` timeout shows "pending" then redirects** | `PaymentCallback.tsx` | User thinks they're activated when they're not |
| M14 | **Legacy Kashier/PaySky code still in `PaymentCallback.tsx`** | `PaymentCallback.tsx` | Dead code paths, confusing maintenance |

### 🔵 LOW — Code Quality

| # | Problem | Location | Impact |
|---|---------|----------|--------|
| L1 | **Dead Kashier backend** (`server.ts`, `webhook.ts`, `kashier.ts`) | `backend/` | Confusion, security risk |
| L2 | **Dead PaySky and Kashier frontend libs** | `frontend/src/lib/` | Dead code with hardcoded secrets |
| L3 | **`PaymentProvider` type lists 3 providers, only 1 works** | `frontend/src/types/dodo.ts` | Misleading types |
| L4 | **`MERCHANT_ID` placeholder never replaced** | `backend/server.ts` L11 | `'your_merchant_id'` still in code |
| L5 | **Convex `subscriptionSync` duplicates Supabase state** | `frontend/convex/schema.ts` | No documented conflict resolution strategy |
| L6 | **No route-level subscription gating** | `ProtectedRoute.tsx` | Subscription checks scattered across components |

---

## 4. Detailed Fix & Improvement Plan

### Phase 1: Critical Database Fixes (Day 1)

#### 1.1 Create Missing RPC Functions

Create `supabase/migrations/YYYYMMDD_create_subscription_rpcs.sql`:

```sql
-- extend_subscription: Adds days to a user's subscription
CREATE OR REPLACE FUNCTION extend_subscription(
    p_user_id uuid,
    p_agent_id uuid DEFAULT NULL,
    p_days integer DEFAULT 30,
    p_plan text DEFAULT 'Professional',
    p_reason text DEFAULT 'subscription_payment'
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_end timestamptz;
    v_new_end timestamptz;
    v_profile record;
BEGIN
    -- Lock the profile row
    SELECT subscription_end_date, subscription_status, subscription_plan
    INTO v_profile
    FROM profiles WHERE id = p_user_id FOR UPDATE;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;

    -- Extend from MAX(current_end, now) to prevent past-date issues
    v_current_end := GREATEST(COALESCE(v_profile.subscription_end_date, NOW()), NOW());
    v_new_end := v_current_end + (p_days || ' days')::interval;

    UPDATE profiles SET
        subscription_status = 'active',
        subscription_plan = p_plan,
        subscription_end_date = v_new_end,
        updated_at = NOW()
    WHERE id = p_user_id;

    -- Log the action
    INSERT INTO subscription_audit_log (user_id, agent_id, action, days, plan, reason, old_end_date, new_end_date)
    VALUES (p_user_id, p_agent_id, 'extend', p_days, p_plan, p_reason, v_profile.subscription_end_date, v_new_end);

    RETURN json_build_object(
        'success', true,
        'new_end_date', v_new_end,
        'days_added', p_days,
        'plan', p_plan
    );
END;
$$;

-- cancel_subscription: Cancels a user's subscription
CREATE OR REPLACE FUNCTION cancel_subscription(
    p_user_id uuid,
    p_agent_id uuid DEFAULT NULL,
    p_reason text DEFAULT 'user_cancelled'
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_profile record;
BEGIN
    SELECT subscription_status, subscription_end_date, subscription_plan
    INTO v_profile
    FROM profiles WHERE id = p_user_id FOR UPDATE;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;

    UPDATE profiles SET
        subscription_status = 'cancelled',
        updated_at = NOW()
    WHERE id = p_user_id;

    INSERT INTO subscription_audit_log (user_id, agent_id, action, plan, reason, old_end_date)
    VALUES (p_user_id, p_agent_id, 'cancel', v_profile.subscription_plan, p_reason, v_profile.subscription_end_date);

    RETURN json_build_object('success', true, 'previous_status', v_profile.subscription_status);
END;
$$;
```

#### 1.2 Create Subscription Audit Log Table

```sql
CREATE TABLE IF NOT EXISTS subscription_audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES profiles(id),
    agent_id uuid REFERENCES profiles(id),
    action text NOT NULL CHECK (action IN ('extend', 'cancel', 'expire', 'trial_start', 'trial_end', 'payment_failed', 'reactivate')),
    days integer,
    plan text,
    reason text,
    old_end_date timestamptz,
    new_end_date timestamptz,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT NOW()
);

CREATE INDEX idx_audit_user_id ON subscription_audit_log(user_id);
CREATE INDEX idx_audit_created_at ON subscription_audit_log(created_at DESC);
CREATE INDEX idx_audit_action ON subscription_audit_log(action);
```

#### 1.3 Add Missing Database Constraints & Indexes

```sql
-- Subscription status CHECK constraint
ALTER TABLE profiles
ADD CONSTRAINT chk_subscription_status
CHECK (subscription_status IS NULL OR subscription_status IN ('active', 'cancelled', 'expired', 'payment_failed', 'trialing'));

-- Composite index for cron expiration queries
CREATE INDEX IF NOT EXISTS idx_profiles_sub_status_end_date
ON profiles(subscription_status, subscription_end_date)
WHERE subscription_status IS NOT NULL;

-- Foreign key on payments
ALTER TABLE payments
ADD CONSTRAINT fk_payments_user_id
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- Unique constraint on merchant_reference per provider
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_unique_merchant_ref
ON payments(provider, merchant_reference)
WHERE merchant_reference IS NOT NULL;

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

#### 1.4 Create Baseline Migration for Core Tables

Create `supabase/migrations/YYYYMMDD_baseline_profiles_payments.sql` documenting the full `profiles` and `payments` CREATE TABLE statements for reproducibility.

---

### Phase 2: Fix Critical Activation Flow (Day 1-2)

#### 2.1 Fix User Resolution — Add Fallback Alert System

In `dodoPayments.ts` `updateSubscriptionLogic`:
- When user cannot be resolved, insert into a new `failed_activations` table
- Send admin notification (email or in-app) with the Dodo subscription details
- Log the full webhook payload for manual recovery

```typescript
// When userId is not found:
if (!userId) {
    // Record failed activation for admin recovery
    await supabaseAdmin.from('failed_activations').insert({
        dodo_subscription_id: subscriptionId,
        dodo_customer_id: customerId,
        customer_email: customerEmail,
        event_type: eventType,
        webhook_payload: payload,
        status: 'pending_resolution',
        created_at: new Date().toISOString()
    });
    
    // TODO: Send admin alert
    return { success: false, error: 'User not identified — logged for manual recovery' };
}
```

#### 2.2 Fix Idempotency for `nextBillingDate` Path

In `updateSubscriptionLogic`, when `nextBillingDate` is provided:
```typescript
if (nextBillingDate) {
    const targetEnd = new Date(nextBillingDate);
    const currentEnd = profile?.subscription_end_date ? new Date(profile.subscription_end_date) : null;
    
    // Idempotency: skip if end dates match within 1 hour
    if (currentEnd && Math.abs(targetEnd.getTime() - currentEnd.getTime()) < 3600000) {
        console.log('Skipping duplicate activation — end dates match');
        return { success: true, skipped: true };
    }
    
    // PATCH with nextBillingDate
    await supabaseAdmin.from('profiles').update({
        subscription_status: 'active',
        subscription_end_date: nextBillingDate,
        subscription_plan: 'Professional'
    }).eq('id', userId);
}
```

#### 2.3 Fix `billingCycle` Metadata Loss

In `updateSubscriptionLogic`, when `billingCycle` is unknown and no `nextBillingDate`:
```typescript
// Instead of defaulting to 'monthly', look up the product from the Dodo subscription
if (!billingCycle || billingCycle === 'monthly') {
    // Check if the product ID corresponds to yearly
    const subData = await fetchDodoSubscription(subscriptionId);
    if (subData?.product_id === YEARLY_PRODUCT_ID) {
        billingCycle = 'yearly';
    }
}
```

#### 2.4 Fix Webhook to Return Non-200 on Activation Failure

```typescript
// In http.ts webhook handler:
const result = await ctx.runAction(internal.dodoPayments.updateSubscription, { ... });
if (!result?.success && !result?.skipped) {
    // Return 500 so Dodo retries the webhook
    return new Response(JSON.stringify({ error: result?.error }), { status: 500 });
}
```

---

### Phase 3: Fix Frontend Issues (Day 2-3)

#### 3.1 Remove All Dead Code

**Delete entirely:**
- `backend/server.ts`
- `backend/webhook.ts`  
- `backend/kashier.ts`
- `frontend/src/lib/kashier.ts`
- `frontend/src/lib/paysky.ts`
- `frontend/src/lib/paymentPoller.ts`
- `frontend/src/pages/PaymentTest.tsx`

**Clean up:**
- Remove Kashier/PaySky imports from `PaymentCallback.tsx`
- Remove `kashier` and `paysky` from `PaymentProvider` type
- Remove `kashier_response` and `paysky_response` references

#### 3.2 Fix or Remove Inline Checkout

**Option A (Recommended): Remove inline checkout entirely**
- Delete `frontend/src/pages/CheckoutInline.tsx`
- Delete `frontend/src/components/checkout/DodoInlineCheckout.tsx`
- Delete `frontend/src/components/checkout/PlanSelector.tsx` (fake Basic plan)
- Remove route for `/checkout-inline`
- The redirect-based `Checkout.tsx` is the working, tested flow

**Option B: Fix inline checkout**
- Fix URL: `.cloud` → `.site`
- Add auth token header
- Fix billing cycle change (clear `checkoutUrl` state)
- Fix PlanSelector to not show fake Basic plan

#### 3.3 Fix Pricing Consistency

In `PricingPage.tsx` and `BillingCycleToggle.tsx`:
- Calculate actual discount: `(($5 × 12) - $50) / ($5 × 12) × 100 = 16.67%`
- Display "SAVE ~17%" or adjust pricing to make it exactly 20% ($48/yr)

#### 3.4 Fix Plan Name Consistency

Standardize on `'Professional'` everywhere:
- `dodoPayments.ts` `createCheckout`: change `planId: 'pro'` to `planId: 'Professional'`
- OR standardize on `'pro'` and update all references

#### 3.5 Add Auth to Verification Endpoint

In `http.ts` `/verifyDodoPayment`:
```typescript
// Require auth token
const user = await getSupabaseUser(authHeader);
if (!user) return new Response('Unauthorized', { status: 401 });
// Ensure requested userId matches authenticated user
if (body.userId !== user.id) return new Response('Forbidden', { status: 403 });
```

#### 3.6 Fix Portal Security Check

In `http.ts` `/dodoPortalSession`:
```typescript
// Actually fetch dodo_customer_id from profile
const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('dodo_customer_id, email')
    .eq('id', user.id)
    .single();

const userDodoId = profile?.dodo_customer_id;

// Now this check actually works
if (providedId && userDodoId && providedId !== userDodoId) {
    return new Response('Customer ID mismatch', { status: 403 });
}
```

#### 3.7 Fix Payment History Query

In `PaymentHistory.tsx`:
```typescript
// Use user_id as primary, email as fallback
const { data } = await supabase
    .from('payments')
    .select('*')
    .or(`user_id.eq.${user.id},user_email.eq.${user.email}`)
    .order('created_at', { ascending: false });
```

#### 3.8 Improve PaymentCallback Timeout Handling

```typescript
// Instead of "activation pending" → redirect, show clear action:
if (attemptsExhausted && status !== 'active') {
    setMessage('Your payment was received but activation is taking longer than expected.');
    setShowRetryButton(true); // Manual retry button
    setShowContactSupport(true); // Link to support
    // Do NOT auto-redirect to dashboard
}
```

---

### Phase 4: Strengthen Subscription Lifecycle (Day 3-4)

#### 4.1 Implement Proper Monthly/Yearly Subscription Model

The subscription system should be clearly structured around two billing intervals:

```
┌─────────────────────────────────────────────────────┐
│               SUBSCRIPTION PLANS                     │
├─────────────────────────────────────────────────────┤
│                                                      │
│  FREE (Starter)          PRO (Professional)          │
│  ─────────────           ─────────────────           │
│  $0/forever              Monthly: $5/month           │
│  3 exams                 Yearly:  $50/year           │
│  Basic features          All features unlocked       │
│                          14-day free trial            │
│                                                      │
│  Billing Cycles:                                     │
│  ─────────────                                       │
│  Monthly → renews every 30 days                      │
│  Yearly  → renews every 365 days                     │
│                                                      │
│  Subscription States:                                │
│  ──────────────────                                  │
│  NULL        → Never subscribed (free tier)          │
│  trialing    → In 14-day trial                       │
│  active      → Paid and active                       │
│  payment_failed → Renewal failed, access continues   │
│                   until subscription_end_date         │
│  expired     → Past subscription_end_date            │
│  cancelled   → User or system cancelled              │
│                                                      │
└─────────────────────────────────────────────────────┘
```

#### 4.2 Add `billing_cycle` Column to Profiles

```sql
ALTER TABLE profiles ADD COLUMN billing_cycle text
CHECK (billing_cycle IS NULL OR billing_cycle IN ('monthly', 'yearly'));

COMMENT ON COLUMN profiles.billing_cycle IS
'Current billing interval: monthly or yearly. NULL for free users.';
```

This field is set during checkout and updated on plan changes. It ensures:
- Renewal extensions use the correct duration (30 vs 365)
- The UI shows the correct billing cycle on Settings page
- Metadata loss from Dodo webhooks doesn't affect activation logic

#### 4.3 Updated Activation Logic

```typescript
async function updateSubscriptionLogic(params) {
    const { userId, status, nextBillingDate, subscriptionId, billingCycle: incomingCycle } = params;
    
    // 1. Resolve user (existing logic + failed_activations fallback)
    
    // 2. Fetch current profile
    const profile = await getProfile(userId);
    
    // 3. Determine billing cycle with fallbacks
    let billingCycle = incomingCycle;
    if (!billingCycle) {
        // Fallback 1: Check profile's stored billing_cycle
        billingCycle = profile.billing_cycle;
    }
    if (!billingCycle) {
        // Fallback 2: Check Dodo subscription product
        const sub = await fetchDodoSubscription(subscriptionId);
        billingCycle = sub?.product_id === YEARLY_PRODUCT_ID ? 'yearly' : 'monthly';
    }
    
    // 4. Idempotency check (works for both paths)
    if (status === 'active' && profile.subscription_status === 'active') {
        const targetEnd = nextBillingDate ? new Date(nextBillingDate) : null;
        const currentEnd = profile.subscription_end_date ? new Date(profile.subscription_end_date) : null;
        if (targetEnd && currentEnd && Math.abs(targetEnd - currentEnd) < 3600000) {
            return { success: true, skipped: true, reason: 'idempotent' };
        }
    }
    
    // 5. Activate
    if (status === 'active') {
        if (nextBillingDate) {
            // Direct PATCH with Dodo's billing date
            await patchProfile(userId, {
                subscription_status: 'active',
                subscription_end_date: nextBillingDate,
                subscription_plan: 'Professional',
                billing_cycle: billingCycle,
                dodo_customer_id: customerId
            });
        } else {
            // RPC extension
            const days = billingCycle === 'yearly' ? 365 : 30;
            await supabase.rpc('extend_subscription', {
                p_user_id: userId,
                p_days: days,
                p_plan: 'Professional',
                p_reason: `dodo_${eventType}`
            });
            // Also update billing_cycle
            await patchProfile(userId, {
                billing_cycle: billingCycle,
                dodo_customer_id: customerId
            });
        }
        
        // Clear trial fields on conversion
        if (profile.subscription_status === 'trialing') {
            await patchProfile(userId, {
                trial_ends_at: null,
                trial_grace_ends_at: null
            });
        }
    }
    
    // 6. Record payment
    await recordPayment({ ... });
    
    // 7. Audit log
    await insertAuditLog({ ... });
    
    return { success: true };
}
```

#### 4.4 Webhook Event Handling Matrix

| Dodo Event | Action | Set Status | Set End Date | Record Payment |
|-----------|--------|------------|-------------|----------------|
| `subscription.active` | Activate | `active` | From `nextBillingDate` or extend by cycle | Yes |
| `subscription.renewed` | Renew | `active` | From `nextBillingDate` or extend by cycle | Yes |
| `subscription.updated` | Sync dates only | No change | From `nextBillingDate` if provided | No |
| `subscription.on_hold` | Mark failed | `payment_failed` | No change | No |
| `subscription.failed` | Mark failed | `payment_failed` | No change | No |
| `subscription.payment_failed` | Mark failed | `payment_failed` | No change | No |
| `subscription.cancelled` | Cancel | `cancelled` | No change | No |
| `payment.succeeded` | Record only | No change | No change | Yes |

**Key change:** `subscription.renewed` should NOT independently call `updateSubscription(active)` if `subscription.active` already handled it. Use webhook dedup + idempotency to prevent double extension.

---

### Phase 5: Admin & Monitoring (Day 4-5)

#### 5.1 Create Failed Activations Table & Admin View

```sql
CREATE TABLE IF NOT EXISTS failed_activations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    dodo_subscription_id text,
    dodo_customer_id text,
    customer_email text,
    event_type text,
    webhook_payload jsonb,
    status text DEFAULT 'pending_resolution'
        CHECK (status IN ('pending_resolution', 'resolved', 'ignored')),
    resolved_by uuid REFERENCES profiles(id),
    resolved_at timestamptz,
    resolution_notes text,
    created_at timestamptz DEFAULT NOW()
);

CREATE INDEX idx_failed_activations_status ON failed_activations(status);
```

#### 5.2 Admin Dashboard Integration

Add a "Failed Activations" section to the admin panel:
- Shows pending failed activations with customer email and Dodo subscription ID
- Admin can manually link to a user profile and trigger activation
- Includes filters: date range, status, email search

#### 5.3 Subscription Health Dashboard

Add monitoring queries:
```sql
-- Users who paid but aren't active (last 7 days)
SELECT p.user_email, p.amount, p.created_at, pr.subscription_status
FROM payments p
LEFT JOIN profiles pr ON pr.id = p.user_id
WHERE p.status = 'completed'
  AND p.created_at > NOW() - INTERVAL '7 days'
  AND (pr.subscription_status IS NULL OR pr.subscription_status != 'active');

-- Subscriptions expiring in next 3 days
SELECT id, email, subscription_end_date, billing_cycle
FROM profiles
WHERE subscription_status = 'active'
  AND subscription_end_date BETWEEN NOW() AND NOW() + INTERVAL '3 days';

-- Failed activation attempts
SELECT * FROM failed_activations
WHERE status = 'pending_resolution'
ORDER BY created_at DESC;
```

---

## 5. Target Monthly/Yearly Subscription Architecture

### State Machine

```
                    ┌──────────┐
                    │   NULL   │ (Free tier)
                    └────┬─────┘
                         │ Start trial
                         ▼
                    ┌──────────┐
                    │ trialing │ (14 days)
                    └────┬─────┘
                         │
              ┌──────────┼──────────┐
              │ Pay       │ Expire    │ Cancel
              ▼          ▼          ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │  active  │ │ expired  │ │cancelled │
        └────┬─────┘ └──────────┘ └──────────┘
             │                          ▲
             │ Renewal fails            │
             ▼                          │
        ┌──────────────┐               │
        │payment_failed├───────────────┘
        └──────┬───────┘  (if not recovered)
               │
               │ Recovers payment
               ▼
        ┌──────────┐
        │  active  │ (renewed)
        └──────────┘
```

### Monthly Subscription Timeline

```
Day 0: Payment → status=active, end_date=+30 days, billing_cycle=monthly
Day 27: Dodo attempts renewal charge
  ├─ Success → webhook subscription.renewed → end_date extended +30 days
  └─ Failure → webhook subscription.payment_failed → status=payment_failed
              ├─ Day 28-30: Grace period (user still has access)
              ├─ Dodo retries payment
              │   ├─ Success → status=active, end_date extended
              │   └─ Final failure → subscription.cancelled → status=cancelled
              └─ Day 30: subscription_end_date reached → cron marks expired
```

### Yearly Subscription Timeline

```
Day 0: Payment → status=active, end_date=+365 days, billing_cycle=yearly
Day ~358: Dodo attempts renewal charge
  ├─ Success → webhook subscription.renewed → end_date extended +365 days
  └─ Failure → same grace period flow as monthly
Day 365: subscription_end_date reached → cron marks expired (if not renewed)
```

### Key Principles

1. **`subscription_end_date` is the single source of truth** for access expiry
2. **`billing_cycle` is persisted** so renewal logic never guesses
3. **`nextBillingDate` from Dodo takes priority** over manual calculation
4. **Idempotency is enforced** at every activation point
5. **Failed activations are always recoverable** via admin panel or reconciliation cron

---

## 6. Database Schema Changes

### New Migration: Subscription System Cleanup

```sql
-- File: supabase/migrations/YYYYMMDD_subscription_system_cleanup.sql

-- 1. Add billing_cycle column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS billing_cycle text
CHECK (billing_cycle IS NULL OR billing_cycle IN ('monthly', 'yearly'));

-- 2. Add subscription_status CHECK constraint (if not exists)
DO $$ BEGIN
    ALTER TABLE profiles ADD CONSTRAINT chk_subscription_status
    CHECK (subscription_status IS NULL OR subscription_status IN ('active', 'cancelled', 'expired', 'payment_failed', 'trialing'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Add composite index for cron queries
CREATE INDEX IF NOT EXISTS idx_profiles_sub_status_end_date
ON profiles(subscription_status, subscription_end_date)
WHERE subscription_status IS NOT NULL;

-- 4. Add foreign key on payments
DO $$ BEGIN
    ALTER TABLE payments ADD CONSTRAINT fk_payments_user_id
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 5. Unique merchant reference per provider
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_unique_ref
ON payments(provider, merchant_reference)
WHERE merchant_reference IS NOT NULL;

-- 6. Create subscription_audit_log
CREATE TABLE IF NOT EXISTS subscription_audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES profiles(id),
    agent_id uuid REFERENCES profiles(id),
    action text NOT NULL,
    days integer,
    plan text,
    reason text,
    old_end_date timestamptz,
    new_end_date timestamptz,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON subscription_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON subscription_audit_log(created_at DESC);

-- 7. Create failed_activations
CREATE TABLE IF NOT EXISTS failed_activations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    dodo_subscription_id text,
    dodo_customer_id text,
    customer_email text,
    event_type text,
    webhook_payload jsonb,
    status text DEFAULT 'pending_resolution',
    resolved_by uuid REFERENCES profiles(id),
    resolved_at timestamptz,
    resolution_notes text,
    created_at timestamptz DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_failed_act_status ON failed_activations(status);

-- 8. Create extend_subscription RPC
CREATE OR REPLACE FUNCTION extend_subscription(
    p_user_id uuid,
    p_agent_id uuid DEFAULT NULL,
    p_days integer DEFAULT 30,
    p_plan text DEFAULT 'Professional',
    p_reason text DEFAULT 'subscription_payment'
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_current_end timestamptz;
    v_new_end timestamptz;
    v_profile record;
BEGIN
    SELECT subscription_end_date, subscription_status, subscription_plan
    INTO v_profile FROM profiles WHERE id = p_user_id FOR UPDATE;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;

    v_current_end := GREATEST(COALESCE(v_profile.subscription_end_date, NOW()), NOW());
    v_new_end := v_current_end + (p_days || ' days')::interval;

    UPDATE profiles SET
        subscription_status = 'active',
        subscription_plan = p_plan,
        subscription_end_date = v_new_end,
        updated_at = NOW()
    WHERE id = p_user_id;

    INSERT INTO subscription_audit_log (user_id, agent_id, action, days, plan, reason, old_end_date, new_end_date)
    VALUES (p_user_id, p_agent_id, 'extend', p_days, p_plan, p_reason, v_profile.subscription_end_date, v_new_end);

    RETURN json_build_object('success', true, 'new_end_date', v_new_end, 'days_added', p_days);
END;
$$;

-- 9. Create cancel_subscription RPC
CREATE OR REPLACE FUNCTION cancel_subscription(
    p_user_id uuid,
    p_agent_id uuid DEFAULT NULL,
    p_reason text DEFAULT 'user_cancelled'
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_profile record;
BEGIN
    SELECT subscription_status, subscription_end_date, subscription_plan
    INTO v_profile FROM profiles WHERE id = p_user_id FOR UPDATE;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;

    UPDATE profiles SET
        subscription_status = 'cancelled',
        updated_at = NOW()
    WHERE id = p_user_id;

    INSERT INTO subscription_audit_log (user_id, agent_id, action, plan, reason, old_end_date)
    VALUES (p_user_id, p_agent_id, 'cancel', v_profile.subscription_plan, p_reason, v_profile.subscription_end_date);

    RETURN json_build_object('success', true, 'previous_status', v_profile.subscription_status);
END;
$$;

-- 10. updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. Unify provider response column
ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider_response jsonb;
-- Migrate existing data
UPDATE payments SET provider_response = kashier_response WHERE kashier_response IS NOT NULL AND provider_response IS NULL;
UPDATE payments SET provider_response = paysky_response WHERE paysky_response IS NOT NULL AND provider_response IS NULL;
```

---

## 7. Backend (Convex) Changes

### 7.1 `dodoPayments.ts` Changes

| Change | What | Why |
|--------|------|-----|
| Add `billing_cycle` persistence | Store `billing_cycle` on profile during activation | Prevent metadata loss from causing wrong extension days |
| Fix idempotency for `nextBillingDate` path | Compare target vs current end date with 1-hour tolerance | Prevent double extensions |
| Add failed activation logging | Insert into `failed_activations` when user can't be resolved | Don't silently lose paid activations |
| Fix plan naming | Standardize to `'Professional'` everywhere | Consistent `subscription_plan` values |
| Add audit logging | Call `subscription_audit_log` insert alongside profile updates | Full audit trail |
| Fix `billingCycle` resolution | Fallback chain: metadata → profile → product ID lookup | Never default to 'monthly' blindly |

### 7.2 `http.ts` Changes

| Change | What | Why |
|--------|------|-----|
| Return non-200 on activation failure | Return 500 when `updateSubscription` fails | Allow Dodo to retry webhooks |
| Add auth to `/verifyDodoPayment` | Require Supabase auth token | Prevent unauthorized verification |
| Fix portal `userDodoId` | Actually fetch `dodo_customer_id` from profile | Enable security check |
| Deduplicate `subscription.active` + `subscription.renewed` | Share idempotency logic | Prevent double processing |

### 7.3 `cronHandlers.ts` Changes

| Change | What | Why |
|--------|------|-----|
| Reduce reconciliation frequency | Change from 15 minutes to 1 hour | Reduce API calls, prevent rate limits |
| Add grace period before expiration marking | Don't mark expired if within 6-hour grace window | Allow webhook processing time |

### 7.4 New: `failedActivations.ts`

Create a new Convex module for admin recovery:
```typescript
// List pending failed activations
export const listFailedActivations = query(...)

// Manually resolve a failed activation
export const resolveFailedActivation = mutation(...)
```

---

## 8. Frontend Changes

### 8.1 Code Cleanup

| Action | Files |
|--------|-------|
| **Delete** | `backend/server.ts`, `backend/webhook.ts`, `backend/kashier.ts` |
| **Delete** | `frontend/src/lib/kashier.ts`, `frontend/src/lib/paysky.ts`, `frontend/src/lib/paymentPoller.ts` |
| **Delete** | `frontend/src/pages/PaymentTest.tsx`, `frontend/src/pages/CheckoutInline.tsx` |
| **Delete** | `frontend/src/components/checkout/DodoInlineCheckout.tsx`, `frontend/src/components/checkout/PlanSelector.tsx` |
| **Clean** | Remove Kashier/PaySky imports from `PaymentCallback.tsx` |
| **Clean** | Remove `'kashier' | 'paysky'` from `PaymentProvider` type in `dodo.ts` |
| **Clean** | Remove route for `/checkout-inline` and `/payment-test` from router |

### 8.2 Checkout.tsx Improvements

- Show correct discount percentage (16.67% or adjust pricing)
- Show billing cycle clearly: "You'll be charged $5/month" or "$50/year"
- Show next billing date after payment
- Handle already-active users better (show current plan details, offer plan change)

### 8.3 Settings.tsx Subscription Section

- Show current plan: "Professional (Monthly/Yearly)"
- Show next billing date
- Show billing cycle with option to switch (monthly ↔ yearly)
- "Manage Billing" → Dodo portal
- "Cancel Subscription" with confirmation
- If `payment_failed`: show "Update Payment Method" → Dodo portal

### 8.4 PaymentCallback.tsx Improvements

- Add auth token to verification requests
- Better error states with actionable messages
- Don't auto-redirect on timeout — show retry/support options
- Remove all Kashier/PaySky callback handling

### 8.5 Update Subscription Gating

Add `billing_cycle` to `AuthContext`:
```typescript
const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly' | null>(null);
// Fetch from profile along with subscription_status
```

---

## 9. Testing Checklist

### Subscription Activation Tests

- [ ] **New monthly subscription**: Checkout → Payment → Webhook → Profile shows `active`, `subscription_end_date` = +30 days, `billing_cycle` = `monthly`
- [ ] **New yearly subscription**: Same as above but `subscription_end_date` = +365 days, `billing_cycle` = `yearly`
- [ ] **Monthly renewal**: Existing active user → renewal webhook → `subscription_end_date` extended by 30 days (not doubled)
- [ ] **Yearly renewal**: Same as above but +365 days
- [ ] **Idempotent activation**: Same webhook sent twice → only one extension applied
- [ ] **Direct verification + webhook race**: Both fire → only one extension
- [ ] **Failed user resolution**: Webhook with bad metadata → `failed_activations` record created
- [ ] **Trial to paid conversion**: User on trial → completes payment → trial fields cleared, status = `active`
- [ ] **Payment failure**: Renewal charge fails → status = `payment_failed`, access continues until `subscription_end_date`
- [ ] **Cancellation**: User cancels → status = `cancelled` via portal
- [ ] **Expiration**: Past `subscription_end_date` + cron runs → status = `expired`
- [ ] **Recovery from payment_failed**: User updates payment → renewal succeeds → status = `active`

### Frontend Tests

- [ ] **Checkout page loads** with correct pricing (monthly and yearly)
- [ ] **Billing cycle toggle** updates price display correctly
- [ ] **Payment redirect** works → returns to callback → shows activation
- [ ] **Settings page** shows current plan, billing cycle, next billing date
- [ ] **Feature gating** works: free users see upgrade prompts, active users have full access
- [ ] **Payment notification** appears on `payment_failed` status
- [ ] **Dodo portal opens** from Settings/notification for billing management

### Security Tests

- [ ] **Webhook signature verification** rejects invalid signatures
- [ ] **Webhook deduplication** prevents replay attacks
- [ ] **Verification endpoint** requires auth token
- [ ] **Portal endpoint** validates customer ID ownership
- [ ] **No hardcoded secrets** in committed code

### Edge Cases

- [ ] **Simultaneous webhook + direct verify** → no double extension
- [ ] **Yearly user with missing metadata** → gets 365 days, not 30
- [ ] **Cron expiration during webhook delay** → grace period prevents false expiration
- [ ] **Email change** → payment history still accessible via `user_id`
- [ ] **Multiple rapid renewals** → only latest applied

---

## 10. Implementation Priority & Timeline

### Day 1 — Critical Database & Activation Fixes
| Task | Priority | Est. Hours |
|------|----------|-----------|
| Create `extend_subscription` and `cancel_subscription` RPCs | 🔴 Critical | 1h |
| Create `subscription_audit_log` and `failed_activations` tables | 🔴 Critical | 1h |
| Add `billing_cycle` column to profiles | 🔴 Critical | 0.5h |
| Add database constraints and indexes | 🔴 Critical | 1h |
| Create baseline migration for `profiles`/`payments` tables | 🔴 Critical | 1h |

### Day 2 — Backend Activation Flow Fixes
| Task | Priority | Est. Hours |
|------|----------|-----------|
| Fix user resolution with `failed_activations` fallback | 🔴 Critical | 2h |
| Fix idempotency for `nextBillingDate` path | 🔴 Critical | 1h |
| Fix `billingCycle` resolution chain | 🔴 Critical | 1h |
| Fix webhook to return non-200 on failure | 🟠 High | 1h |
| Add auth to `/verifyDodoPayment` | 🟠 High | 1h |
| Fix portal security check | 🟠 High | 0.5h |
| Standardize plan naming | 🟠 High | 0.5h |

### Day 3 — Frontend Cleanup & Fixes
| Task | Priority | Est. Hours |
|------|----------|-----------|
| Delete all dead code (Kashier, PaySky, inline checkout) | 🟠 High | 2h |
| Fix `PaymentCallback.tsx` (remove legacy, add auth, fix timeout) | 🟠 High | 2h |
| Fix pricing display inconsistency | 🟡 Medium | 0.5h |
| Fix `PaymentHistory.tsx` query | 🟡 Medium | 0.5h |
| Update Settings page with billing cycle display | 🟡 Medium | 1h |

### Day 4 — Monitoring & Admin Tools
| Task | Priority | Est. Hours |
|------|----------|-----------|
| Admin view for failed activations | 🟠 High | 3h |
| Subscription health monitoring queries | 🟡 Medium | 1h |
| Reduce reconciliation cron frequency | 🟡 Medium | 0.5h |
| Add grace period to expiration cron | 🟡 Medium | 1h |

### Day 5 — Testing & Validation
| Task | Priority | Est. Hours |
|------|----------|-----------|
| Run full testing checklist | 🔴 Critical | 4h |
| Fix any issues found during testing | Variable | 2-4h |
| Documentation update | 🟡 Medium | 1h |

---

## Summary

The subscription system has a solid foundation with Dodo Payments integration but suffers from:

1. **Missing critical database functions** (`extend_subscription`, `cancel_subscription`) that could silently fail on fresh deployments
2. **Silent activation failures** when user resolution fails — no alerting, no recovery path
3. **Yearly subscription metadata loss** that could give $50/year subscribers only 30 days
4. **Extensive dead code** from abandoned Kashier/PaySky integrations with hardcoded secrets
5. **Security gaps** in verification and portal endpoints
6. **No audit trail** for subscription changes
7. **Inconsistent data** (plan names, pricing displays, double extension risks)

The plan above addresses every issue with prioritized, actionable tasks that can be completed in approximately 5 working days.
