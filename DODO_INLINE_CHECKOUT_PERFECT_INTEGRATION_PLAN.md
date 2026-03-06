# Dodo Payments Inline Checkout — Perfect Integration Plan

> Generated: March 3, 2026
> Based on: Full codebase analysis + Official Dodo Payments Inline Checkout Docs

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Issues & Gaps Identified](#2-issues--gaps-identified)
3. [Official Dodo Inline Checkout Requirements](#3-official-dodo-inline-checkout-requirements)
4. [Architecture Decision: Checkout Sessions vs Old Subscriptions API](#4-architecture-decision)
5. [Implementation Plan — Phase by Phase](#5-implementation-plan)
6. [Phase 1: Backend — Migrate to Checkout Sessions API](#phase-1-backend)
7. [Phase 2: Frontend — Build True Inline Checkout Page](#phase-2-frontend)
8. [Phase 3: Event Handling & Payment Verification](#phase-3-events)
9. [Phase 4: Theme, Dark Mode & Responsive Design](#phase-4-theme)
10. [Phase 5: Webhook Handler Hardening](#phase-5-webhooks)
11. [Phase 6: Customer Portal & Subscription Management](#phase-6-portal)
12. [Phase 7: Error Handling, Edge Cases & Recovery](#phase-7-errors)
13. [Phase 8: Testing Checklist](#phase-8-testing)
14. [Full Code Specifications](#9-full-code-specifications)

---

## 1. Current State Analysis

### What Exists Today

| Component | File | Status |
|---|---|---|
| **Backend: createCheckout** | `convex/dodoPayments.ts` | Uses OLD `POST /subscriptions` API (dynamic payment links), NOT Checkout Sessions |
| **Backend: Webhook handler** | `convex/http.ts` `/dodoWebhook` | Solid — handles all subscription events with HMAC verification + deduplication |
| **Backend: State machine** | `convex/subscriptions.ts` | Excellent — properly enforced single-source-of-truth with audit log |
| **Backend: Verify payment** | `convex/dodoPayments.ts` `verifyPayment` | Works but uses old payment/subscription GET API |
| **Backend: Portal** | `convex/dodoPayments.ts` `createPortal` | Works — customer portal session creation |
| **Backend: Login sync** | `convex/dodoPayments.ts` `syncSubscriptionFromProvider` | Good fallback for missed webhooks |
| **Frontend: Checkout page** | `src/pages/Checkout.tsx` | **Redirect-based only** — creates checkout URL, does `window.location.assign()` |
| **Frontend: useDodoCheckout hook** | `src/hooks/useDodoCheckout.ts` | Exists but **NOT USED** — initialized with `displayType: 'overlay'` instead of `'inline'` |
| **Frontend: Theme** | `src/config/dodoTheme.ts` | Good — proper light/dark theme config |
| **Frontend: Types** | `src/types/dodo.ts` | Comprehensive TypeScript types |
| **Frontend: Payment callback** | `src/pages/PaymentCallback.tsx` | Works for redirect-based flow |
| **Frontend: Portal helper** | `src/lib/dodoPortal.ts` | Works |
| **SDK Version** | `package.json` | `dodopayments-checkout@^1.5.0` |

### Current Checkout Flow (Redirect-Based)

```
User clicks "Continue to secure checkout"
  → POST /createDodoPayment (Convex HTTP)
    → dodoPayments.createCheckout (Convex action)
      → POST https://live.dodopayments.com/subscriptions (OLD API)
      → Returns payment_link URL
  → window.location.assign(payment_link)
  → User completes payment on Dodo's hosted page
  → Redirect to /payment-callback?provider=dodo&orderId=...
  → PaymentCallback.tsx polls for activation
```

---

## 2. Issues & Gaps Identified

### Critical Issues

| # | Issue | Impact | Severity |
|---|---|---|---|
| 1 | **Uses old `/subscriptions` API instead of Checkout Sessions** | Missing features: trial periods, discount codes, custom fields, pre-confirmed sessions, short links, currency selection | 🔴 High |
| 2 | **Inline checkout hook exists but is UNUSED** | The `useDodoCheckout.ts` hook sets `displayType: 'overlay'` and is never imported in `Checkout.tsx` | 🔴 High |
| 3 | **No real-time order summary** | User sees static price only; no live tax/discount breakdown from `checkout.breakdown` event | 🟡 Medium |
| 4 | **No coupon/discount code support** | Cannot apply discount codes during checkout | 🟡 Medium |
| 5 | **No trial period configuration** via checkout session | Trials are managed separately in code; should use `subscription_data.trial_period_days` | 🟡 Medium |
| 6 | **Theme config not passed** to `Checkout.open()` | `dodoTheme.ts` exists but is never applied to the inline checkout | 🟡 Medium |
| 7 | **No skeleton/loading state** | No loading indicator shown while checkout frame loads | 🟢 Low |
| 8 | **`checkOrigin: false` hack** in useDodoCheckout | Bypasses iframe security — not needed with proper `displayType: 'inline'` | 🟢 Low |
| 9 | **Console.error monkey-patching** | Suppresses iframe-resizer errors — fragile | 🟢 Low |

### Architecture Gaps

- No `@dodopayments/convex` component used (official Convex adapter exists)
- No checkout session preview (for showing prices before checkout loads)
- No `manualRedirect: true` handling for 3DS/Google Pay properly in inline mode
- Payment verification only checks via API polling, not via webhook-confirmed DB state

---

## 3. Official Dodo Inline Checkout Requirements

Based on the official docs at `docs.dodopayments.com/developer-resources/inline-checkout`:

### Required Elements for Compliant Inline Checkout

1. **Recurring information** — frequency and renewal amount
2. **Item descriptions** — what's being purchased
3. **Transaction totals** — subtotal, tax, discount, grand total with currency
4. **Dodo Payments footer** — must show full checkout frame including legal footer
5. **Refund policy** — link to refund policy

### SDK Initialization (Correct Way)

```typescript
import { DodoPayments } from "dodopayments-checkout";

DodoPayments.Initialize({
  mode: "live",         // PRODUCTION — use "test" only during development
  displayType: "inline", // MUST be "inline" for embedded checkout
  onEvent: (event) => {
    // Handle checkout.breakdown, checkout.status, checkout.redirect_requested, etc.
  },
});
```

### Opening Checkout

```typescript
DodoPayments.Checkout.open({
  checkoutUrl: "https://checkout.dodopayments.com/session/cks_...",
  elementId: "dodo-inline-checkout", // DOM container ID
  options: {
    showTimer: true,
    showSecurityBadge: true,
    manualRedirect: true,    // Handle redirects ourselves
    payButtonText: "Subscribe Now",
  },
});
```

### Key Events to Handle

| Event | Purpose |
|---|---|
| `checkout.opened` | Frame loaded — hide skeleton |
| `checkout.form_ready` | Form ready for input |
| `checkout.breakdown` | Live price/tax/discount update → sync order summary |
| `checkout.customer_details_submitted` | Customer info captured |
| `checkout.pay_button_clicked` | Analytics tracking |
| `checkout.status` | Payment succeeded/failed/processing (with `manualRedirect: true`) |
| `checkout.redirect_requested` | 3DS/Google Pay — save state, redirect user |
| `checkout.link_expired` | Session expired — prompt retry |
| `checkout.error` | Error — show fallback UI |

### Backend: Checkout Sessions API (New Way)

```typescript
// Using Node.js SDK
import DodoPayments from 'dodopayments';

const client = new DodoPayments({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY,
  environment: 'live_mode', // PRODUCTION — use 'test_mode' only during development
});

const session = await client.checkoutSessions.create({
  product_cart: [{ product_id: 'pdt_xxx', quantity: 1 }],
  customer: { email: 'user@example.com', name: 'John' },
  return_url: 'https://yourapp.com/payment-callback',
  subscription_data: { trial_period_days: 14 },
  feature_flags: {
    allow_discount_code: true,
    allow_currency_selection: true,
  },
  metadata: { userId: '...', billingCycle: 'monthly' },
});

// Returns: { session_id: "cks_...", checkout_url: "https://checkout.dodopayments.com/session/cks_..." }
```

### Payment Verification Architecture (from official docs)

```
1. checkout.status event fires → Start polling server
2. Server webhook receives payment.succeeded / subscription.active → Updates DB
3. Frontend polls server endpoint → Sees confirmed status → Shows success
4. NEVER rely solely on client-side events
```

---

## 4. Architecture Decision

### Option A: Use `@dodopayments/convex` Component (Official Adapter)
- **Pros**: Official, maintained, includes webhook verification + checkout + portal
- **Cons**: Requires restructuring entire backend to component architecture, adds dependency, may conflict with existing custom state machine
- **Verdict**: ❌ Not recommended for this project — the existing custom state machine is robust and well-tested

### Option B: Migrate to Checkout Sessions API with Inline SDK ✅ RECOMMENDED
- **Pros**: Uses modern Checkout Sessions API, keeps existing battle-tested backend, adds inline checkout with real-time breakdown
- **Cons**: Manual API call (not using SDK client class)
- **Verdict**: ✅ Best approach — maximum control with modern API

**Decision: Option B** — Keep the existing robust backend infrastructure but upgrade:
1. `createCheckout` → use Checkout Sessions API (`POST /checkout-sessions`)
2. Frontend → proper inline checkout with `displayType: 'inline'`
3. Add real-time order summary from `checkout.breakdown` events

---

## 5. Implementation Plan — Phase by Phase

### Overview

```
Phase 1: Backend — Checkout Sessions API          [DONE ✅]
Phase 2: Frontend — Inline Checkout Page           [DONE ✅]
Phase 3: Event Handling & Payment Verification     [~2 hours]
Phase 4: Theme, Dark Mode & Responsive Design      [~1 hour]
Phase 5: Webhook Handler Hardening                 [~1 hour]
Phase 6: Portal & Subscription Management          [~1 hour]
Phase 7: Error Handling, Edge Cases & Recovery     [~1 hour]
Phase 8: Testing                                   [~2 hours]
```

---

## Phase 1: Backend — Migrate to Checkout Sessions API {#phase-1-backend} ✅ COMPLETED

> **Status**: Implemented on all files. `createCheckout` now uses `POST /checkout-sessions`, returns `session_id`, supports `enableTrial`. HTTP route looks up subscription and passes `enableTrial`.

### Task 1.1: Update `createCheckout` action

**File**: `frontend/convex/dodoPayments.ts`

**Current** (using old subscriptions API):
```typescript
const res = await fetch(`${baseUrl}/subscriptions`, {
  method: "POST",
  headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    product_id: productId,
    customer: { email: args.userEmail, name: args.userName },
    metadata: { userId: args.userId, billingCycle: args.billingCycle, planId: "professional" },
    return_url: args.returnUrl,
    quantity: 1,
  }),
});
```

**New** (using Checkout Sessions API):
```typescript
const res = await fetch(`${baseUrl}/checkout-sessions`, {
  method: "POST",
  headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    product_cart: [{ product_id: productId, quantity: 1 }],
    customer: {
      email: args.userEmail,
      name: args.userName,
    },
    return_url: args.returnUrl,
    metadata: {
      userId: args.userId,
      billingCycle: args.billingCycle,
      planId: "professional",
    },
    // Enable trial for first-time subscribers
    ...(args.enableTrial ? { subscription_data: { trial_period_days: 14 } } : {}),
    // Feature flags
    feature_flags: {
      allow_discount_code: true,
      allow_currency_selection: true,
      redirect_immediately: true, // Skip Dodo success page, redirect to our callback
    },
    // Customization
    customization: {
      theme: 'dark', // Or detect from user preference
    },
    billing_currency: "USD",
  }),
});
```

**Key changes**:
- Endpoint: `/subscriptions` → `/checkout-sessions`
- Body: `product_id` → `product_cart: [{ product_id, quantity }]`
- Response: `payment_link` → `checkout_url`
- Added: `subscription_data`, `feature_flags`, `customization`
- New arg: `enableTrial: v.optional(v.boolean())`

### Task 1.2: Update HTTP route handler

**File**: `frontend/convex/http.ts` — `/createDodoPayment` route

Update to pass `enableTrial` based on whether user is first-time subscriber:

```typescript
// Check if first-time subscriber
let enableTrial = false;
const convexSub = await ctx.runQuery(internal.subscriptions.getByUserId, { userId: authUser.id });
if (!convexSub || convexSub.status === 'expired' || convexSub.status === 'cancelled') {
  // Check if they've never had a subscription before
  if (!convexSub) enableTrial = true;
}

const result = await ctx.runAction(internal.dodoPayments.createCheckout, {
  userId: authUser.id,
  userEmail: authUser.email,
  userName: userName || authUser.email.split("@")[0],
  billingCycle: billingCycle || "monthly",
  returnUrl: returnUrl || "https://tutors.durrahsystem.tech/payment-callback?provider=dodo",
  enableTrial,
});
```

### Task 1.3: Update response handling

The Checkout Sessions API returns:
```json
{
  "session_id": "cks_xxx",
  "checkout_url": "https://checkout.dodopayments.com/session/cks_xxx"
}
```

Update `createCheckout` return:
```typescript
return {
  checkout_url: data.checkout_url,
  session_id: data.session_id,
};
```

---

## Phase 2: Frontend — Build True Inline Checkout Page {#phase-2-frontend} ✅ COMPLETED

> **Status**: `Checkout.tsx` fully rewritten as two-column inline layout. `useDodoCheckout.ts` fixed: `displayType: 'inline'`, no monkey-patching, no `checkOrigin` hack, DURRAH_DODO_THEME applied.

### Task 2.1: Redesign Checkout.tsx for Inline Checkout

Replace the current redirect-only flow with a two-column layout:
- **Left**: Dodo inline checkout frame (payment form)
- **Right**: Custom order summary synced via `checkout.breakdown` events

**New `Checkout.tsx` structure**:

```tsx
// Layout structure
<div className="min-h-screen bg-gradient-to-br ...">
  <header>...</header>
  
  <main className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:gap-8">
    
    {/* Left Column: Checkout Frame */}
    <section className="relative">
      {/* Loading skeleton (shown until checkout.opened event) */}
      {!isCheckoutReady && <CheckoutSkeleton />}
      
      {/* Dodo inline checkout container */}
      <div id="dodo-inline-checkout" className="w-full min-h-[500px]" />
    </section>
    
    {/* Right Column: Order Summary */}
    <aside className="sticky top-24">
      <OrderSummary
        plan={selectedPlan}
        billingCycle={billingCycle}
        breakdown={breakdown}
        isLoading={!isCheckoutReady}
      />
    </aside>
    
  </main>
</div>
```

### Task 2.2: Fix and Use `useDodoCheckout` Hook

**Current bug**: `displayType: 'overlay'` — must change to `'inline'`

```typescript
// FIXED initialization
DodoPayments.Initialize({
  mode,
  displayType: 'inline',  // Was 'overlay' — CRITICAL FIX
  onEvent: handleEvent,
});
```

Remove the `checkOrigin: false` hack and console.error monkey-patching.

### Task 2.3: Build `OrderSummary` Component

New component that renders real-time breakdown data:

```tsx
function OrderSummary({ plan, billingCycle, breakdown, isLoading }: OrderSummaryProps) {
  const formatAmount = (cents: number | null | undefined, currency: string) => {
    if (cents == null) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(cents / 100);
  };

  const currency = breakdown?.currency ?? breakdown?.finalTotalCurrency ?? 'USD';

  return (
    <div className="rounded-3xl border ... p-6">
      <h3>Order Summary</h3>
      
      {/* Plan info */}
      <div className="flex justify-between">
        <span>Professional ({billingCycle})</span>
        <span>{formatAmount(breakdown?.subTotal, currency)}</span>
      </div>
      
      {/* Discount (if applied) */}
      {breakdown?.discount && breakdown.discount > 0 && (
        <div className="flex justify-between text-green-600">
          <span>Discount</span>
          <span>-{formatAmount(breakdown.discount, currency)}</span>
        </div>
      )}
      
      {/* Tax */}
      <div className="flex justify-between">
        <span>Tax</span>
        <span>{breakdown?.tax != null ? formatAmount(breakdown.tax, currency) : '—'}</span>
      </div>
      
      <hr />
      
      {/* Total */}
      <div className="flex justify-between font-bold text-xl">
        <span>Total</span>
        <span>
          {formatAmount(
            breakdown?.finalTotal ?? breakdown?.total,
            breakdown?.finalTotalCurrency ?? currency
          )}
        </span>
      </div>
      
      {/* Recurring info (compliance requirement) */}
      <p className="text-xs text-gray-500 mt-3">
        {billingCycle === 'monthly'
          ? 'Renews monthly. Cancel anytime from Settings.'
          : 'Renews yearly. Cancel anytime from Settings.'}
      </p>
    </div>
  );
}
```

### Task 2.4: Build `CheckoutSkeleton` Component

Show a loading state while the checkout frame initializes:

```tsx
function CheckoutSkeleton() {
  return (
    <div className="animate-pulse space-y-4 p-8">
      <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl w-3/4" />
      <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl w-1/2" />
      <div className="h-14 bg-blue-200 dark:bg-blue-800 rounded-xl mt-6" />
    </div>
  );
}
```

### Task 2.5: Checkout Page Flow

```
1. Page loads → Create checkout session (POST /createDodoPayment)
2. Receive { checkout_url, session_id }
3. Initialize DodoPayments SDK with displayType: 'inline'
4. Call DodoPayments.Checkout.open({ checkoutUrl, elementId: 'dodo-inline-checkout' })
5. Show skeleton until checkout.opened event
6. Update OrderSummary in real-time via checkout.breakdown events
7. On checkout.status (succeeded) → Start polling server for confirmation
8. On checkout.redirect_requested → Save state, redirect for 3DS
9. On return from redirect → Resume verification polling
```

---

## Phase 3: Event Handling & Payment Verification {#phase-3-events}

### Task 3.1: Comprehensive Event Handler

```typescript
const handleEvent = useCallback((event: CheckoutEvent) => {
  const eventType = event.event_type as string;
  
  switch (eventType) {
    case 'checkout.opened':
      setIsCheckoutReady(true);
      break;
      
    case 'checkout.form_ready':
      // Form is interactive — could track analytics
      break;
      
    case 'checkout.breakdown': {
      const data = event.data?.message as CheckoutBreakdownData;
      if (data) {
        setBreakdown(data);
        // Update order summary in real-time
      }
      break;
    }
    
    case 'checkout.customer_details_submitted':
      // Customer filled in their details — show progress
      break;
      
    case 'checkout.pay_button_clicked':
      setPaymentProcessing(true);
      // Analytics: track conversion funnel
      break;
      
    case 'checkout.status': {
      const status = (event.data?.message as any)?.status;
      if (status === 'succeeded') {
        // Start SERVER-SIDE verification polling
        startVerificationPolling();
      } else if (status === 'failed') {
        setPaymentStatus('failed');
        toast.error('Payment failed. Please try again.');
      } else if (status === 'processing') {
        setPaymentStatus('processing');
      }
      break;
    }
    
    case 'checkout.redirect_requested': {
      const redirectUrl = (event.data?.message as any)?.redirect_to;
      if (redirectUrl) {
        // Save state for return
        sessionStorage.setItem('pendingCheckoutSessionId', sessionId);
        sessionStorage.setItem('checkoutBillingCycle', billingCycle);
        window.location.href = redirectUrl;
      }
      break;
    }
    
    case 'checkout.link_expired':
      setError({ message: 'Session expired. Please try again.', code: 'SESSION_EXPIRED', retryable: true });
      break;
      
    case 'checkout.error':
      const errMsg = (event.data?.message as string) || 'Checkout error';
      setError({ message: errMsg, code: 'CHECKOUT_ERROR', retryable: true });
      break;
  }
}, [sessionId, billingCycle]);
```

### Task 3.2: Server-Side Payment Verification (Polling)

**Critical**: Per official docs, NEVER rely solely on client-side events.

```typescript
const startVerificationPolling = useCallback(async () => {
  setPaymentStatus('verifying');
  const maxAttempts = 15; // 30 seconds total
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      // Option 1: Call our Convex verify endpoint
      const res = await fetch(`${siteUrl}/verifyDodoPayment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ orderId: sessionId, userId: user.id }),
      });
      
      if (res.ok) {
        const result = await res.json();
        if (result.success) {
          setPaymentStatus('succeeded');
          toast.success('Subscription activated!');
          navigate('/dashboard', { replace: true });
          return;
        }
      }
      
      // Option 2: Check Supabase profile directly
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status')
        .eq('id', user.id)
        .single();
        
      if (profile?.subscription_status === 'active') {
        setPaymentStatus('succeeded');
        toast.success('Subscription activated!');
        navigate('/dashboard', { replace: true });
        return;
      }
    } catch (err) {
      console.warn('Verification attempt failed:', err);
    }
    
    await new Promise(r => setTimeout(r, 2000));
  }
  
  // Timeout — webhook might be delayed
  setPaymentStatus('pending');
  toast('Payment received. Activation may take a moment.');
}, [sessionId, user, navigate]);
```

---

## Phase 4: Theme, Dark Mode & Responsive Design {#phase-4-theme}

### Task 4.1: Apply Theme to Inline Checkout

The theme is already defined in `src/config/dodoTheme.ts`. Apply it:

```typescript
DodoPayments.Checkout.open({
  checkoutUrl,
  elementId: 'dodo-inline-checkout',
  options: {
    showTimer: true,
    showSecurityBadge: true,
    manualRedirect: true,
    payButtonText: 'Subscribe Now',
    themeConfig: isDarkMode ? DURRAH_DODO_THEME.dark : DURRAH_DODO_THEME.light,
  },
});
```

### Task 4.2: Dark Mode Background

Per official docs: use `#0d0d0d` as background for dark mode inline checkout.

```css
/* Container styling */
.dark #dodo-inline-checkout {
  background-color: #0d0d0d;
  border-radius: 12px;
}
```

### Task 4.3: Responsive Layout

```
Desktop (lg+): Two columns — checkout left, summary right
Tablet (md):   Two columns with smaller gaps
Mobile (<md):  Single column — summary on top, checkout below
```

```tsx
<main className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
  {/* Mobile: Order summary first */}
  <aside className="lg:col-span-5 lg:order-2">
    <OrderSummary ... />
  </aside>
  
  {/* Checkout frame */}
  <section className="lg:col-span-7 lg:order-1">
    <div id="dodo-inline-checkout" className="w-full min-h-[520px]" />
  </section>
</main>
```

---

## Phase 5: Webhook Handler Hardening {#phase-5-webhooks}

### Task 5.1: Handle Checkout Sessions Webhooks

Checkout Sessions may emit webhooks, verify these are handled:

The existing webhook handler in `convex/http.ts` already handles:
- ✅ `subscription.active`
- ✅ `subscription.renewed`
- ✅ `subscription.updated`
- ✅ `subscription.on_hold`
- ✅ `subscription.failed`
- ✅ `subscription.plan_changed`
- ✅ `subscription.expired`
- ✅ `subscription.cancelled`
- ✅ `payment.succeeded`
- ✅ `payment.failed`

**No changes needed** — the webhook handler is already comprehensive.

### Task 5.2: Add Checkout Session ID to Metadata

Store the checkout session ID (`cks_...`) in webhook metadata for traceability:

```typescript
metadata: {
  userId: args.userId,
  billingCycle: args.billingCycle,
  planId: "professional",
  checkoutSessionId: data.session_id, // NEW
},
```

---

## Phase 6: Customer Portal & Subscription Management {#phase-6-portal}

### Current Status: ✅ Already Working

- `dodoPayments.createPortal` action works
- `dodoPortal.ts` frontend helper works
- Settings page uses `openDodoPortalSession()`

### Enhancement: Inline Portal Option

Could use the same inline approach for payment method updates:

```typescript
// For on-hold subscriptions — update payment method inline
const response = await client.subscriptions.updatePaymentMethod('sub_123', {
  type: 'new',
  return_url: 'https://tutors.durrahsystem.tech/settings',
});

DodoPayments.Checkout.open({
  checkoutUrl: response.payment_link,
  elementId: 'dodo-update-payment',
});
```

---

## Phase 7: Error Handling, Edge Cases & Recovery {#phase-7-errors}

### Task 7.1: Error States UI

```tsx
{error && (
  <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
    <div className="flex items-center gap-3">
      <AlertCircle className="text-red-500" />
      <div>
        <h3 className="font-semibold text-red-800">{error.message}</h3>
        {error.retryable && (
          <button onClick={retryCheckout} className="mt-2 text-red-600 underline">
            Try again
          </button>
        )}
      </div>
    </div>
  </div>
)}
```

### Task 7.2: Session Expiry Handling

```typescript
case 'checkout.link_expired':
  DodoPayments.Checkout.close();
  setError({ 
    message: 'Your checkout session has expired.',
    code: 'SESSION_EXPIRED',
    retryable: true 
  });
  // Auto-create new session after small delay
  setTimeout(() => createNewSession(), 1000);
  break;
```

### Task 7.3: 3DS Return Handling

When user returns from 3DS redirect:

```typescript
useEffect(() => {
  const pendingSession = sessionStorage.getItem('pendingCheckoutSessionId');
  if (pendingSession) {
    sessionStorage.removeItem('pendingCheckoutSessionId');
    setPaymentStatus('verifying');
    // Start polling immediately — payment may have already succeeded via webhook
    startVerificationPolling();
  }
}, []);
```

### Task 7.4: Network Error Recovery

```typescript
// If createCheckout fails, show fallback redirect option
{networkError && (
  <div className="text-center">
    <p>Having trouble loading checkout?</p>
    <button onClick={handleRedirectFallback} className="btn-secondary">
      Open in new window instead
    </button>
  </div>
)}
```

### Task 7.5: Failed Activation Recovery

Already implemented in `convex/dodoPayments.ts` via `failed_activations` table. No changes needed.

---

## Phase 8: Testing Checklist {#phase-8-testing}

### Production Setup

1. Use `mode: "live"` in SDK initialization (use `"test"` only during local development)
2. Use LIVE API key (starts with `live_`) — the backend auto-detects via `getDodoBaseUrl()`
3. Product IDs: `pdt_0NVdw6iZw42sQIdxctP55` (yearly), `pdt_0NVdvPLWrAr1Rym66kXLP` (monthly)

### Test Cases

| # | Test Case | Expected Result |
|---|---|---|
| 1 | Page load → checkout session creation | Inline checkout frame rendered in container |
| 2 | Frame loads | Skeleton hidden, form visible |
| 3 | User enters country/ZIP | `checkout.breakdown` fires, order summary updates with tax |
| 4 | Apply discount code | Breakdown shows discount, total adjusts |
| 5 | Click pay with test card | `checkout.status: succeeded`, polling confirms |
| 6 | Click pay with declined card | `checkout.status: failed`, error shown |
| 7 | 3DS redirect flow | Redirect → return → verify → success |
| 8 | Session expires (wait 24h or test) | `checkout.link_expired`, new session auto-created |
| 9 | Close browser mid-payment | Webhook still fires, login sync recovers state |
| 10 | Dark mode toggle | Theme applies correctly to checkout frame |
| 11 | Mobile viewport | Single column layout, scrollable |
| 12 | Portal session | Opens Dodo customer portal, user can manage subscription |
| 13 | Webhook deduplication | Same webhook ID processed only once |
| 14 | Renewal webhook | Status stays active, end date extended |
| 15 | Cancel from portal | `subscription.cancelled` webhook → state machine updates |

### Test Cards (Dodo Test Mode)

| Card Number | Result |
|---|---|
| `4242 4242 4242 4242` | Succeeds |
| `4000 0000 0000 0002` | Declined |
| `4000 0027 6000 3184` | 3DS Required |

---

## 9. Full Code Specifications {#9-full-code-specifications}

### Files to MODIFY

| File | Changes |
|---|---|
| `frontend/convex/dodoPayments.ts` | `createCheckout` → Checkout Sessions API; add `enableTrial` arg |
| `frontend/convex/http.ts` | `/createDodoPayment` route → pass `enableTrial`; return `session_id` |
| `frontend/src/hooks/useDodoCheckout.ts` | Fix `displayType: 'inline'`; remove hacks; handle all events properly |
| `frontend/src/pages/Checkout.tsx` | Full rewrite → inline checkout with order summary |
| `frontend/src/pages/PaymentCallback.tsx` | Minor — handle return from 3DS inline flow |

### Files to CREATE

| File | Purpose |
|---|---|
| `frontend/src/components/checkout/OrderSummary.tsx` | Real-time breakdown display |
| `frontend/src/components/checkout/CheckoutSkeleton.tsx` | Loading state |
| `frontend/src/components/checkout/CheckoutError.tsx` | Error/retry UI |
| `frontend/src/components/checkout/BillingCycleToggle.tsx` | Monthly/yearly toggle |

### Files UNCHANGED (Already Good)

| File | Reason |
|---|---|
| `frontend/convex/subscriptions.ts` | State machine is solid |
| `frontend/src/config/dodoTheme.ts` | Theme config is good, just needs to be applied |
| `frontend/src/types/dodo.ts` | Types are comprehensive |
| `frontend/src/lib/dodoPortal.ts` | Portal helper works |
| `frontend/src/lib/subscriptionUtils.ts` | Utility functions work |
| `frontend/convex/schema.ts` | Schema is correct |

### Environment Variables Required

| Variable | Location | Value |
|---|---|---|
| `DODO_PAYMENTS_API_KEY` | Convex Dashboard | `live_xxx` (PRODUCTION) |
| `DODO_WEBHOOK_SECRET` | Convex Dashboard | `whsec_xxx` |
| `SUPABASE_URL` | Convex Dashboard | Already set |
| `SUPABASE_SERVICE_ROLE_KEY` | Convex Dashboard | Already set |
| `VITE_CONVEX_URL` | `.env.local` | Already set |

### NPM Dependencies

```json
{
  "dodopayments-checkout": "^1.5.0"  // Already installed ✅
}
```

No new dependencies needed.

---

## Summary: What Changes

```
┌────────────────────────────────────────────────────────────────┐
│                    BEFORE (Current)                             │
│                                                                │
│  User → Clicks button → API creates subscription link          │
│  → Full page redirect to Dodo hosted checkout                  │
│  → User completes payment on Dodo's page                       │
│  → Redirect back to /payment-callback                          │
│  → Poll for activation                                         │
│                                                                │
│  ❌ User leaves your site during payment                       │
│  ❌ No real-time order summary                                 │
│  ❌ No inline discount code                                    │
│  ❌ Old API (subscriptions endpoint)                           │
│  ❌ useDodoCheckout hook unused                                │
└────────────────────────────────────────────────────────────────┘
                           ↓↓↓
┌────────────────────────────────────────────────────────────────┐
│                    AFTER (Perfect Integration)                 │
│                                                                │
│  User → Checkout page loads → API creates checkout session      │
│  → Inline checkout frame renders IN the page                   │
│  → Real-time order summary (subtotal, tax, discount, total)    │
│  → User completes payment WITHOUT leaving the page             │
│  → checkout.status event → Server-side verification polling    │
│  → Smooth transition to dashboard                              │
│                                                                │
│  ✅ User stays on your site throughout                         │
│  ✅ Live order summary with tax calculation                    │
│  ✅ Discount code support                                      │
│  ✅ Modern Checkout Sessions API                               │
│  ✅ Proper displayType: 'inline'                               │
│  ✅ Theme applied (light/dark)                                 │
│  ✅ 3DS redirect handling                                      │
│  ✅ Session expiry auto-recovery                               │
│  ✅ Skeleton loading states                                    │
│  ✅ Server-side payment verification (not just client events)  │
└────────────────────────────────────────────────────────────────┘
```

---

## Ready to Implement?

This plan covers every aspect of a perfect Dodo Payments inline checkout integration:
- **Backend**: Modern Checkout Sessions API with trial support and feature flags
- **Frontend**: True inline embedded checkout with real-time order summary
- **Events**: All 10 SDK events handled properly
- **Verification**: Server-side polling (not just client-side events)
- **Theme**: Matching Durrah Exams design system in light and dark mode
- **Errors**: Session expiry, network failures, 3DS returns, declined cards
- **Webhooks**: Already robust, minor metadata enhancement
- **Testing**: Complete test matrix with test cards

Say "go" to begin implementation.
