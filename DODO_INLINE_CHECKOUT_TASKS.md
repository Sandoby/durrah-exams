# Dodo Payments Inline Checkout — Implementation Tasks

> Reference: `DODO_INLINE_CHECKOUT_PERFECT_INTEGRATION_PLAN.md`
> Target: LIVE production (`mode: "live"`, live API key, `https://live.dodopayments.com`)

---

## Phase 1: Backend — Migrate to Checkout Sessions API

### Task 1.1 — Update `createCheckout` action
- **File**: `frontend/convex/dodoPayments.ts` → `createCheckout` action
- [x] Change API endpoint from `POST /subscriptions` to `POST /checkout-sessions`
- [x] Change request body from `{ product_id, customer, metadata, return_url, quantity }` to:
  ```
  {
    product_cart: [{ product_id, quantity: 1 }],
    customer: { email, name },
    return_url,
    metadata: { userId, billingCycle, planId },
    subscription_data: { trial_period_days: 14 },   // if enableTrial
    feature_flags: { allow_discount_code: true, allow_currency_selection: true, redirect_immediately: true },
    billing_currency: "USD"
  }
  ```
- [x] Add new arg: `enableTrial: v.optional(v.boolean())`
- [x] Update response parsing: `data.checkout_url` (not `data.payment_link`)
- [x] Return both `checkout_url` and `session_id` from the action
- [x] Verify `getDodoBaseUrl()` correctly returns `https://live.dodopayments.com` for live key

### Task 1.2 — Update HTTP route `/createDodoPayment`
- **File**: `frontend/convex/http.ts`
- [x] Look up user's subscription record to determine if first-time subscriber
- [x] Pass `enableTrial: true` only for users without any prior subscription
- [x] Return `session_id` alongside `checkout_url` in response JSON
- [x] Ensure CORS headers are present

### Task 1.3 — Verify environment variables
- **Location**: Convex Dashboard → Settings → Environment Variables
- [ ] `DODO_PAYMENTS_API_KEY` → must be `live_xxx` for production
- [ ] `DODO_WEBHOOK_SECRET` → must match live webhook secret (`whsec_xxx`)
- [ ] `SUPABASE_URL` → already set
- [ ] `SUPABASE_SERVICE_ROLE_KEY` → already set

---

## Phase 2: Frontend — Build True Inline Checkout Page

### Task 2.1 — Redesign `Checkout.tsx`
- **File**: `frontend/src/pages/Checkout.tsx`
- [x] On page load, call `POST /createDodoPayment` to get `{ checkout_url, session_id }`
- [x] Store `checkoutUrl` and `sessionId` in state
- [x] Create two-column layout:
  - Left (lg:col-span-1): Plan info, features, billing toggle
  - Right (lg:col-span-1): Dodo inline checkout container `<div id="dodo-checkout-frame" />`
- [x] On mobile: single column — plan info on top, checkout below
- [x] Show billing cycle toggle (monthly/yearly) BEFORE session creation
- [x] Show skeleton loading state until frame loads
- [x] Handle already-active subscriptions (redirect banner)
- [x] Handle `payment_failed` / `on_hold` users (redirect to portal)
- [x] Keep existing native-app flow (Capacitor Browser.open) as fallback
- [x] Fallback redirect button for users where iframe fails

### Task 2.2 — Fix `useDodoCheckout` hook
- **File**: `frontend/src/hooks/useDodoCheckout.ts`
- [x] Change `displayType: 'overlay'` → `displayType: 'inline'` **(CRITICAL)**
- [x] Change `mode` to use environment-based detection (defaults to `'live'`)
- [x] Remove `checkOrigin: false` hack from `Checkout.open()` call
- [x] Remove `console.error` monkey-patching (no longer needed with inline mode)
- [x] Pass `themeConfig` from `dodoTheme.ts` to `Checkout.open()` options
- [x] Set `manualRedirect: true` in options
- [x] Add `options.showTimer: true` and `options.showSecurityBadge: true`
- [x] Properly handle all SDK events

### Task 2.3 — Create `OrderSummary` component
- **File**: `frontend/src/components/checkout/OrderSummary.tsx` (NEW)
- [x] Accept props: `plan`, `billingCycle`, `breakdown` (CheckoutBreakdownData), `isLoading`
- [x] Format amounts from cents using `Intl.NumberFormat`
- [x] Display subtotal, discount, tax, total from SDK breakdown
- [x] Add recurring billing notice: "Renews {monthly/yearly}. Cancel anytime."
- [x] Style: glassmorphic card matching project design system
- [x] Handle loading state with skeleton pulse animation

### Task 2.4 — Create `CheckoutSkeleton` component
- **File**: `frontend/src/components/checkout/CheckoutSkeleton.tsx` (NEW)
- [x] Animated pulse skeleton mimicking the checkout form shape
- [x] Show inside `#dodo-inline-checkout` container while loading
- [x] Hide once `checkout.opened` event fires

### Task 2.5 — Create `CheckoutError` component
- **File**: `frontend/src/components/checkout/CheckoutError.tsx` (NEW)
- [x] Display error message, error code, and retry button (if retryable)
- [x] "Open in new window" fallback option for network errors
- [x] Red/warning styling matching design system

### Task 2.6 — Create `BillingCycleToggle` component
- **File**: `frontend/src/components/checkout/BillingCycleToggle.tsx` (NEW)
- [x] Monthly / Yearly toggle pill (same style as current Checkout.tsx)
- [x] Show yearly discount badge: "Save 17%"
- [x] Disabled state while checkout is loading
- [x] NOTE: Changing billing cycle requires creating a NEW checkout session

---

## Phase 3: Event Handling & Payment Verification

### Task 3.1 — Implement full event handler
- **File**: `frontend/src/hooks/useDodoCheckout.ts` (or inline in Checkout.tsx)
- [x] `checkout.opened` → set `isCheckoutReady = true`, hide skeleton
- [x] `checkout.form_ready` → mark form interactive (optional analytics)
- [x] `checkout.breakdown` → update `breakdown` state → OrderSummary re-renders
- [x] `checkout.pay_button_clicked` → set `paymentProcessing = true`, analytics event
- [x] `checkout.status`: succeeded → polling, failed → error, processing → spinner
- [x] `checkout.redirect_requested` → save `sessionId` to sessionStorage → navigate
- [x] `checkout.link_expired` → auto-create new session (max 3 retries)
- [x] `checkout.error` → show error component with message

### Task 3.2 — Server-side payment verification polling
- **File**: `frontend/src/pages/Checkout.tsx`
- [x] Create `verifyPaymentWithPolling()` function
- [x] Poll `POST /verifyDodoPayment` every 2 seconds, max 15 attempts (30s)
- [x] Fallback: check `supabase.from('profiles').select('subscription_status')`
- [x] On `subscription_status === 'active'`: success UI → navigate to `/dashboard` after 1.5s
- [x] On timeout (30s): show "Activation taking longer than expected" state
- [x] On `payment_failed` / `on_hold`: show failed status

### Task 3.3 — Handle 3DS / redirect return
- **File**: `frontend/src/pages/Checkout.tsx`
- [x] On mount, check `sessionStorage.getItem('pendingDodoSessionId')`
- [x] If present: remove from storage, set `paymentStatus = 'verifying'`, start polling immediately
- [x] Show "Verifying payment..." UI while polling
- [x] If no session found but URL has payment params → use PaymentCallback.tsx flow

---

## Phase 4: Theme, Dark Mode & Responsive Design

### Task 4.1 — Apply theme config to checkout frame
- **File**: `frontend/src/hooks/useDodoCheckout.ts`
- [x] `DURRAH_DODO_THEME` already imported and passed as `themeConfig` prop
- [x] Full config (`light` + `dark` + `radius: "12px"`) passed to `DodoPayments.Checkout.open()` options
- [x] SDK handles light/dark mode detection automatically from the full ThemeConfig

### Task 4.2 — Dark mode container styling
- **File**: `frontend/src/pages/Checkout.tsx`
- [x] Iframe mount div: `dark:bg-[#0d0d0d]` (matches SDK `dark.bgPrimary` — seamless blend)
- [x] Right column card: `dark:bg-[#0a0a0a] dark:border-white/[0.07]` (near-black, minimal border)
- [x] Card header bar: `dark:border-white/[0.06]` for subtle separator
- [x] Footer bar: `dark:border-white/[0.06]` consistency
- [x] Page background: `dark:bg-[#060609]` (deepest dark) with ambient orbs
- [x] Sticky header: `dark:bg-[#060609]/90 backdrop-blur-md` (frosted glass)

### Task 4.3 — Responsive layout
- **File**: `frontend/src/pages/Checkout.tsx`
- [x] Desktop (`lg+`): asymmetric `grid-cols-[1fr_460px]` — more space for checkout form
- [x] Gap: `gap-10 xl:gap-16` for breathing room
- [x] Mobile (`< lg`): single column stack (plan info above, checkout below)
- [x] Right column: `lg:sticky lg:top-[80px] lg:self-start` for scroll-pinned checkout frame
- [x] Iframe container: `min-h-[520px] sm:min-h-[580px]` to prevent layout jumps on mobile
- [x] Header: `sticky top-0 z-20` with `backdrop-blur-md` (accounts for sticky column offset)
- [x] Added social proof strip (avatar dots + star rating) to left column
- [x] Plan card: gradient headline, top accent line, enhanced shadow + glow
- [x] Trust indicators: single card with dividers instead of scattered boxes
- [x] Overlays (success/verifying/native): ambient orbs, top accent lines, modern card styling

---

## Phase 5: Webhook Handler Hardening

### Task 5.1 — Verify all webhook events handled
- **File**: `frontend/convex/http.ts`
- [x] Confirm handler covers: `subscription.active`, `subscription.renewed`, `subscription.updated`, `subscription.on_hold`, `subscription.failed`, `subscription.plan_changed`, `subscription.expired`, `subscription.cancelled`, `payment.succeeded`, `payment.failed`
- [x] ALL COVERED ✅ — no changes needed

### Task 5.2 — Add checkout session tracking to metadata
- **File**: `frontend/convex/dodoPayments.ts` → `createCheckout`
- [x] Created `frontend/convex/checkoutSessions.ts` with `store`, `markConverted`, `markFailed` mutations
- [x] Added `checkoutSessions` table to Convex schema with `by_session_id`, `by_user_id`, `by_user_status`, `by_created_at` indexes
- [x] In `/createDodoPayment`: save session record after checkout creation (non-fatal if fails)
- [x] On `subscription.active` webhook: call `markConverted({ userId, subscriptionId })`
- [x] On `subscription.failed/on_hold` webhook: call `markFailed({ userId })` to clear pending sessions
- [x] Enables tracing webhook → session → user + "abandoned checkout" analytics

### Task 5.3 — Verify signature verification works with live webhook
- **File**: `frontend/convex/http.ts` → `verifyDodoSignature()`
- [x] Signature parser handles `v1,<sig>`, `v1=<sig>`, and plain `<sig>` formats
- [x] Strips `whsec_` prefix before base64-decoding
- [x] Tries base64-decoded key AND raw UTF-8 key (handles both Dodo key formats)
- [x] Compares both base64 and hex output signatures
- [ ] Test with a real live webhook from Dodo dashboard (requires live traffic)

---

## Phase 6: Customer Portal & Subscription Management

### Task 6.1 — Verify portal works in live mode
- **File**: `frontend/convex/dodoPayments.ts` → `createPortal`
- [ ] Portal endpoint: `POST /customers/{id}/customer-portal/session`
- [ ] Confirm `getDodoBaseUrl()` returns `https://live.dodopayments.com` for live key
- [ ] Test: user can open portal from Settings page

### Task 6.2 — (Optional) Inline payment method update for on-hold subscriptions
- **File**: `frontend/src/pages/Checkout.tsx`
- [ ] If user arrives with `on_hold` status, offer inline payment update
- [ ] Call `PATCH /subscriptions/{id}/update-payment-method` API
- [ ] Open returned `payment_link` in inline checkout frame (same SDK)
- [ ] Listen for `payment.succeeded` + `subscription.active` to confirm reactivation
- [ ] Fallback: redirect to Dodo customer portal

---

## Phase 7: Error Handling, Edge Cases & Recovery

### Task 7.1 — Error states UI
- **File**: `frontend/src/pages/Checkout.tsx`
- [ ] If `createDodoPayment` fails → show error with "Try again" button
- [ ] If checkout frame fails to load → show "Open in new window" fallback
- [ ] If session expires → auto-create new session, show brief "Refreshing..." message
- [ ] If payment declines → show error from SDK, offer retry

### Task 7.2 — Session expiry auto-recovery
- **File**: `frontend/src/pages/Checkout.tsx`
- [ ] On `checkout.link_expired` event:
  1. Call `DodoPayments.Checkout.close()`
  2. Show "Session expired, creating new one..." message
  3. Call `POST /createDodoPayment` again
  4. Re-open checkout with new URL
- [ ] Prevent infinite loop — max 3 retries

### Task 7.3 — Network resilience
- [ ] Add `try/catch` around `POST /createDodoPayment` with user-friendly error
- [ ] Add retry logic with exponential backoff (1s, 2s, 4s)
- [ ] If all retries fail → show "Open checkout in new window" redirect fallback

### Task 7.4 — Cleanup on unmount
- **File**: `frontend/src/hooks/useDodoCheckout.ts`
- [ ] Call `DodoPayments.Checkout.close()` in useEffect return/cleanup
- [ ] Remove any sessionStorage entries on successful completion
- [ ] Cancel any pending polling intervals

---

## Phase 8: Testing & QA

### Task 8.1 — Test with LIVE mode
> Use test cards if Dodo supports them in live mode, or use a real payment method in a small amount.
- [ ] **Happy path**: Load checkout → enter details → pay → verify subscription activates
- [ ] **Breakdown sync**: Enter country → verify tax appears in OrderSummary
- [ ] **Discount code**: Apply a coupon → verify discount row appears in OrderSummary
- [ ] **Declined card**: Use a card that declines → verify error shows, retry works
- [ ] **3DS flow**: Use card requiring 3DS → redirect → return → verify activation
- [ ] **Session expiry**: Wait or manually expire → verify auto-recovery
- [ ] **Dark mode**: Toggle dark mode → verify checkout frame and summary both adapt
- [ ] **Mobile**: Test on phone viewport → verify single-column layout, scrollable
- [ ] **Portal**: Open subscription portal from Settings → verify loads correctly
- [ ] **Webhook**: Check Convex logs for webhook received → verify state machine transition

### Task 8.2 — Test edge cases
- [ ] **Close browser mid-payment**: Reopen → login → verify login sync recovers state
- [ ] **Double-click pay**: Ensure no duplicate charges
- [ ] **Expired user re-subscribing**: Verify `enableTrial = false` (no double trial)
- [ ] **Network offline**: Verify graceful error message

### Task 8.3 — Cross-browser testing
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

---

## Summary Checklist

### Files to MODIFY
- [ ] `frontend/convex/dodoPayments.ts` — `createCheckout` → Checkout Sessions API
- [ ] `frontend/convex/http.ts` — `/createDodoPayment` → pass `enableTrial` + return `session_id`
- [ ] `frontend/src/hooks/useDodoCheckout.ts` — Fix `displayType: 'inline'`, remove hacks, proper events
- [ ] `frontend/src/pages/Checkout.tsx` — Full rewrite → inline checkout + order summary

### Files to CREATE
- [ ] `frontend/src/components/checkout/OrderSummary.tsx`
- [ ] `frontend/src/components/checkout/CheckoutSkeleton.tsx`
- [ ] `frontend/src/components/checkout/CheckoutError.tsx`
- [ ] `frontend/src/components/checkout/BillingCycleToggle.tsx`

### Files UNCHANGED (already correct)
- [x] `frontend/convex/subscriptions.ts` — state machine ✅
- [x] `frontend/src/config/dodoTheme.ts` — theme ✅
- [x] `frontend/src/types/dodo.ts` — types ✅
- [x] `frontend/src/lib/dodoPortal.ts` — portal helper ✅
- [x] `frontend/src/lib/subscriptionUtils.ts` — utils ✅
- [x] `frontend/convex/schema.ts` — schema ✅
- [x] `frontend/src/pages/PaymentCallback.tsx` — redirect callback ✅

### Environment (LIVE)
- [ ] `DODO_PAYMENTS_API_KEY` → `live_xxx` ✅
- [ ] `DODO_WEBHOOK_SECRET` → live `whsec_xxx` ✅
- [ ] SDK mode → `"live"` ✅
- [ ] Webhook URL → points to live Convex deployment ✅

---

## Execution Order

```
1. Phase 1 (Backend)     — Do FIRST, deploy, test API call works
2. Phase 2 (Frontend)    — Build UI components + checkout page
3. Phase 3 (Events)      — Wire up all events + verification polling
4. Phase 4 (Theme)       — Apply theme + dark mode + responsive
5. Phase 5 (Webhooks)    — Verify + add session tracking
6. Phase 7 (Errors)      — Handle all edge cases
7. Phase 6 (Portal)      — Verify portal in live mode
8. Phase 8 (Testing)     — Full QA pass
```

> Total estimated effort: ~13 hours
> Say "go" to start implementation.
