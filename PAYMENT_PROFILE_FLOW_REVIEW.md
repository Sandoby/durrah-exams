# Payment, Profile Activation, Email, And Notification Flow Review

Review date: 2026-07-04

Scope reviewed:
- Dodo checkout, callback, portal, webhook, and verification flows
- Supabase `profiles` subscription fields and trial RPCs
- Convex subscription state machine, crons, webhook dedupe, and admin mutations
- Payment, welcome, push, and in-app notification paths
- Admin/support activation and deactivation tools

## Executive Summary

The current system has the right high-level idea: Convex owns subscription transitions, then syncs state back to Supabase `profiles` for the existing frontend. However, the implementation is split across several generations of logic. Some users are activated only in Supabase, while cron expiration/reminders only inspect Convex. Some webhook states say users should keep access, but frontend access checks immediately block them. There are also missing transactional emails, optional webhook verification, and inconsistent trial RPC contracts.

The biggest gaps are:

1. Trial activation writes only Supabase, but Convex cron is responsible for trial expiration.
2. `on_hold` and `payment_failed` keep an end date, but `hasActiveAccess()` blocks premium immediately.
3. Dodo webhook signature validation is optional if `DODO_WEBHOOK_SECRET` is missing.
4. Direct payment verification can activate without sending success email or in-app notification.
5. `subscription.active` does not send the existing `payment_success` email.
6. Payment callback can remain in a loading state after timeout with no real completion path.
7. Webhook deduplication only treats webhooks as duplicates for one hour.
8. Trial eligibility RPC return type differs across migrations and frontend callers.

## Critical Findings

### 1. Trial users can be missed by Convex expiration cron

Evidence:
- `Register.tsx` and `Login.tsx` call Supabase RPC `activate_trial`.
- `activate_trial` updates `profiles.subscription_status`, `trial_ends_at`, and `subscription_end_date`.
- Convex `checkTrialExpirations` reads only Convex `subscriptions`, not Supabase `profiles`.
- `seedFromSupabase` exists but is a one-time internal action, not part of registration/trial activation.

Impact:
- A new trial can become `trialing` in Supabase and get premium access, but never exist in Convex.
- Convex trial expiration/reminder cron will not process that user.
- Trial users can remain `trialing` indefinitely unless another process syncs them.

Recommended fix:
- Move trial activation into Convex `subscriptions.transition(...)`, or make the Supabase `activate_trial` call immediately create/update the Convex subscription record.
- Add a periodic reconciliation job that compares Supabase `profiles` with Convex `subscriptions`.
- Add an admin diagnostic for â€œSupabase trialing/active profile missing Convex subscriptionâ€‌.

### 2. `on_hold` keeps end date but frontend immediately removes access

Evidence:
- Convex state machine says `on_hold` / `payment_failed` keep the current end date.
- `PaymentFailedBanner` tells users to update payment to avoid interruption and displays days remaining.
- `hasActiveAccess()` returns true only for `active` and `trialing`.
- Many premium gates call `hasActiveAccess(profile?.subscription_status)` without end date.

Impact:
- A failed renewal can put a user into `on_hold`, and the UI immediately blocks premium features even if the subscription still has time left.
- The warning UI and backend state-machine behavior disagree.

Recommended fix:
- Decide the policy explicitly:
  - If `on_hold` should retain access until `subscription_end_date`, update `hasActiveAccess()` to allow `on_hold` with a future end date.
  - If failed payments should block immediately, update banners and state-machine comments, and clear/expire end dates consistently.
- Pass `subscription_end_date` to all `hasActiveAccess()` calls, not only Dashboard.

### 3. Webhook signature verification is fail-open

Evidence:
- `frontend/convex/http.ts` verifies Dodo webhook signatures only inside `if (secret)`.
- If `DODO_WEBHOOK_SECRET` is missing, the webhook accepts and processes unsigned requests.

Impact:
- A missing environment variable turns the payment webhook into an unauthenticated subscription mutation endpoint.
- Attackers could activate/cancel users if the route is discoverable.

Recommended fix:
- Fail closed when `DODO_WEBHOOK_SECRET` is missing in production.
- Return `500` or `401` and alert operators.
- Add a health check that reports webhook secret configuration without exposing the secret.

### 4. Direct verification bypasses notifications and success email

Evidence:
- `PaymentCallback.tsx` calls `/verifyDodoPayment`.
- `verifyPayment` calls `subscriptions.transition(...)` directly.
- It does not call `updateSubscription`, so it skips in-app notifications and payment success email dispatch.

Impact:
- Users activated through the callback fallback may get active access, but no success notification/email.
- Activation side effects differ depending on whether webhook or direct verification wins.

Recommended fix:
- Make `verifyPayment` call the same action path as webhooks, or move side effects into `performTransition`.
- Ensure every activation path records payment, sends success email, creates in-app notification, and syncs Supabase.

## High Findings

### 5. `subscription.active` does not send payment success email

Evidence:
- `send-payment-email` supports `payment_success`.
- Webhook handler sends `subscription_renewed` and `payment_failed`, but not `payment_success` on initial activation.

Impact:
- New subscribers may not receive a payment confirmation email.
- Support loses an important audit trail for successful first payments.

Recommended fix:
- Send `payment_success` during `subscription.active` after successful transition and payment recording.
- Log the send result in `email_logs` or a dedicated transactional email table.

### 6. Payment callback can get stuck in loading after webhook timeout

Evidence:
- After 10 polling attempts, `PaymentCallback.tsx` sets `status` back to `loading` and changes message to â€œactivation is taking longerâ€‌.
- The loading UI has no dashboard/support action button.

Impact:
- Users can see an endless verification spinner even after the code says they should check the dashboard.

Recommended fix:
- Add a terminal `pending` state with buttons: â€œGo to Dashboardâ€‌, â€œRetry Verificationâ€‌, and â€œContact Supportâ€‌.
- Store enough callback context to retry direct verification.

### 7. Webhook dedupe only works for one hour

Evidence:
- `isWebhookProcessed` returns duplicate only if `processed_at > hourAgo`.
- Cleanup deletes after seven days, but dedupe ignores records older than one hour.
- `active -> active` transitions are intentionally allowed for renewals, so late duplicate activation can create duplicate audit entries and notifications.

Impact:
- Provider retries or delayed duplicate deliveries after one hour can replay side effects.
- Payment recording relies on database uniqueness and ignored errors rather than explicit idempotency.

Recommended fix:
- Treat webhook IDs as permanently processed until cleanup.
- Keep dedupe records for at least the provider retry horizon.
- Use provider event ID and payment/subscription IDs as secondary idempotency keys.

### 8. Trial eligibility RPC contract is inconsistent

Evidence:
- `20260210000000_add_trial_columns.sql` defines `check_trial_eligibility` returning boolean.
- `20260222000000_subscription_rebuild.sql` redefines it returning jsonb.
- `PremiumFeatureModal.tsx` uses `setIsTrialEligible(!!eligible)`, which treats any returned object as true, even `{ eligible: false }`.
- Other code manually checks profile/payment history instead.

Impact:
- Trial CTAs can be shown to ineligible users depending on which migration is active.
- Users may see â€œstart trialâ€‌ then get an RPC failure.

Recommended fix:
- Standardize `check_trial_eligibility` to one return shape.
- Update callers to read `eligible === true` or `result.eligible === true` explicitly.
- Remove duplicate frontend eligibility logic.

### 9. Convex checkout session tracking exists but is unused

Evidence:
- `checkoutSessions.ts` has store/converted/failed helpers.
- `createCheckout` does not store checkout sessions.
- Webhook activation does not call `checkoutSessions.markConverted`.

Impact:
- The system cannot reliably trace a checkout session to a webhook if Dodo metadata is missing.
- Abandoned checkout analytics and duplicate-session protection are not active.

Recommended fix:
- Store checkout session/subscription ID immediately after Dodo returns.
- Mark sessions converted/failed from webhook handlers.
- Use checkout session lookup as a fallback user-resolution path.

### 10. Subscription expired webhook maps to `cancelled`

Evidence:
- `subscription.expired` webhook calls `updateSubscription(... status: "cancelled")`.
- UI and state machine support an `expired` state.
- Cron expiration transitions paid subscriptions to `expired`.

Impact:
- Expiration semantics differ based on whether Dodo webhook or cron handles it first.
- Emails, filters, and support diagnostics can report different states for the same business event.

Recommended fix:
- Map provider expiration to internal `expired`.
- Reserve `cancelled` for explicit cancellation.
- Define whether `expired -> cancelled` should happen later, and only after a clear retention/grace policy.

## Medium Findings

### 11. On-login provider sync endpoint is not called

Evidence:
- `/syncDodoSubscription` exists.
- No frontend caller was found.

Impact:
- The intended â€œwebhooks + on-login syncâ€‌ redundancy is incomplete.
- Missed webhooks may remain missed until manual callback or support intervention.

Recommended fix:
- Call `/syncDodoSubscription` after auth settles for non-trial users with Dodo IDs or paid subscription history.
- Rate-limit the call per user/session.

### 12. Payment email delivery has weak observability

Evidence:
- `send-welcome-email` writes to `email_logs`.
- `send-payment-email` does not write logs.
- Convex `sendEmail` only warns on failures.

Impact:
- Support cannot easily prove whether payment emails were sent.
- Email provider failures do not surface to admins.

Recommended fix:
- Log every payment email attempt with type, recipient, provider response, and status.
- Add an admin email-delivery diagnostic.

### 13. Push notification audience filters are inconsistent

Evidence:
- `send-push-notification` uses `subscription_status=eq.active` for subscribed users.
- App access treats `trialing` as active in several places.
- Free users are selected with `subscription_status=neq.active`, which may exclude nulls depending on PostgREST semantics.

Impact:
- Trial users miss subscribed-user notifications.
- Free-user broadcasts may miss users with null subscription status.

Recommended fix:
- Define subscribed as `active OR trialing` for notification targeting.
- Define free as null or not in active/trialing.

### 14. In-app notification schema and service are not aligned

Evidence:
- Base `notifications_schema.sql` has no `related_id`.
- `notificationsService.ts` inserts `related_id`.
- Later classroom migration adds `related_id`, but this dependency is not obvious.

Impact:
- Environments missing the later migration will fail classroom notifications.

Recommended fix:
- Create a dedicated notification schema migration that includes all current columns.
- Keep service payload types aligned with the database.

### 15. Admin/support mutation auth is mostly application-level

Evidence:
- Convex `adminExtendSubscription` and `adminDeactivateSubscription` accept `adminId` but do not independently verify an admin or agent permission.
- Frontend support tools enforce permissions before calling.

Impact:
- If Convex functions are callable by a client with generated API access, permission checks may be bypassed.

Recommended fix:
- Enforce admin/support permissions in Convex mutations using a verified identity or a server-side permission lookup.
- Treat frontend permission checks as UI only.

### 16. Profile RLS policy for subscription fields is fragile

Evidence:
- User profile updates are allowed with a `WITH CHECK` that compares `subscription_status`, but other subscription-related fields such as plan/end date/customer IDs are not explicitly protected there.
- `Settings.tsx` upserts only profile fields now, but future changes could accidentally include subscription columns.

Impact:
- Subscription data protection relies on careful frontend payloads and partial RLS checks.

Recommended fix:
- Split mutable public profile fields from billing/subscription fields, or use RPCs for profile updates.
- Add explicit RLS protection for all subscription columns.

## Low Findings

### 17. Older payment providers and docs remain in codebase

Evidence:
- Backend contains Kashier stubs and docs mention Paddle/PaySky/Kashier.
- Current checkout uses only Dodo through Convex.

Impact:
- Future maintainers may patch the wrong payment flow.

Recommended fix:
- Mark legacy provider code as deprecated or remove it.
- Keep one current payment architecture doc.

### 18. Payment amount/currency normalization is unclear

Evidence:
- Dodo payload fields use `amount` or `total_amount`.
- `recordPayment` stores raw numeric values without documented minor-unit conversion.

Impact:
- Payment history may show cents as dollars or provider-specific units.

Recommended fix:
- Confirm Dodo amount units and normalize before writing `payments.amount`.
- Store raw provider payload separately.

## Recommended Fix Order

1. Fail closed on missing Dodo webhook secret.
2. Fix trial activation so Convex and Supabase are both updated atomically.
3. Decide and implement `on_hold` access semantics across backend and frontend.
4. Standardize trial eligibility RPC and frontend callers.
5. Make all activation paths share one transition side-effect path.
6. Add success emails and email logging for payment events.
7. Fix webhook dedupe window and idempotency keys.
8. Add on-login subscription sync.
9. Fix payment callback pending UX.
10. Add admin diagnostics for Supabase/Convex subscription drift.

## Suggested Diagnostics To Add

- Profiles `active` or `trialing` but no Convex subscription.
- Convex subscription status differs from Supabase profile status.
- Supabase `active/trialing` with past `subscription_end_date`.
- Dodo customer/subscription IDs missing for paid users.
- Failed activations unresolved for more than 15 minutes.
- Webhooks received but no corresponding audit log transition.
- Payment records without matching subscription state.
- Payment emails failed or missing for completed payments.

## Files Most Likely To Need Changes

- `frontend/convex/http.ts`
- `frontend/convex/dodoPayments.ts`
- `frontend/convex/subscriptions.ts`
- `frontend/convex/cronHandlers.ts`
- `frontend/src/lib/subscriptionUtils.ts`
- `frontend/src/pages/PaymentCallback.tsx`
- `frontend/src/components/dashboard/PremiumFeatureModal.tsx`
- `frontend/src/pages/Register.tsx`
- `frontend/src/pages/Login.tsx`
- `supabase/functions/send-payment-email/index.ts`
- Supabase migrations for profiles, notifications, and trial RPCs


