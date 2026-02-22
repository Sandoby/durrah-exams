# Deployment Checklist - Subscription System Fixes

## Pre-Deployment

- [x] ✅ Code changes completed
- [x] ✅ Testing script created
- [x] ✅ Documentation written
- [ ] ⏳ Review all changes
- [ ] ⏳ Backup current database (Supabase snapshot)
- [ ] ⏳ Backup current Convex deployment

## Deployment Steps

### Step 1: Deploy Convex Changes
```bash
cd frontend
npx convex deploy
```

**Expected Output**:
```
✓ Deploying...
✓ Building /_generated...
✓ Deploying functions...
✓ Deploying cron jobs...
✓ Deployment complete!
```

**Verify**:
- [ ] No errors in deployment output
- [ ] All functions deployed successfully
- [ ] Cron jobs scheduled

### Step 2: Verify Database Tables

**Go to**: Convex Dashboard → Data → Tables

**Check for**:
- [ ] `webhookEvents` table exists
- [ ] `subscriptionSync` table exists
- [ ] `jobsMeta` table exists (should already exist)

**Indexes to verify**:
- [ ] `webhookEvents.by_webhook_id`
- [ ] `webhookEvents.by_processed_at`
- [ ] `webhookEvents.by_provider`
- [ ] `subscriptionSync.by_user`
- [ ] `subscriptionSync.by_last_synced`
- [ ] `subscriptionSync.by_status`

### Step 3: Verify Cron Jobs

**Go to**: Convex Dashboard → Crons

**Check for**:
- [ ] `auto-submit expired exams` (30 seconds) - Already exists
- [ ] `cleanup stale sessions` (2 minutes) - Already exists
- [ ] `expire presence` (1 minute) - Already exists
- [ ] `cleanup old leaderboards` (daily 00:00 UTC) - Already exists
- [ ] `check subscription expirations` (6 hours) - **NEW**
- [ ] `cleanup old webhooks` (weekly Monday 3 AM) - **NEW**

### Step 4: Configure Dodo Webhook

**Go to**: Dodo Dashboard → Settings → Webhooks

**Webhook URL**: `https://<your-convex-deployment>.site/dodoWebhook`

**Events to Subscribe**:
- [ ] `subscription.active`
- [ ] `subscription.renewed`
- [ ] `subscription.cancelled`
- [ ] `subscription.expired`
- [ ] `subscription.failed`
- [ ] `subscription.payment_failed`
- [ ] `payment.succeeded`

**Webhook Secret**:
- [ ] Copy webhook secret from Dodo
- [ ] Add to Convex environment variables:
  - Key: `DODO_WEBHOOK_SECRET`
  - Value: `whsec_...`

### Step 5: Test Webhook Endpoint

**Option A: Using curl**
```bash
curl -X OPTIONS https://<your-deployment>.site/dodoWebhook
```

Expected: HTTP 200

**Option B: Dodo Dashboard**
- [ ] Send test webhook from Dodo Dashboard
- [ ] Check Convex logs for received webhook
- [ ] Verify webhook appears in `webhookEvents` table

### Step 6: Run Testing Script

```bash
chmod +x test-subscription-system.sh
./test-subscription-system.sh
```

Follow interactive prompts and verify each test passes.

### Step 7: Manual Function Tests

**Test 1: Expiration Check**
1. Go to Convex Dashboard → Functions
2. Run: `cronHandlers.checkSubscriptionExpirations`
3. Check logs for: `[Expiration Check] Processed X profiles`
4. Verify no errors

**Test 2: Webhook Cleanup**
1. Go to Convex Dashboard → Functions
2. Run: `webhookHelpers.cleanupOldWebhooks`
3. Check logs for: `[Webhook Cleanup] Deleted X old webhook records`

**Test 3: Subscription Stats**
1. Go to Convex Dashboard → Functions
2. Run: `subscriptionQueries.getSubscriptionStats`
3. Verify returns object with stats:
   ```json
   {
     "total": 0,
     "active": 0,
     "cancelled": 0,
     "expired": 0,
     "payment_failed": 0,
     "errors": 0,
     "recent_syncs": 0
   }
   ```

## Post-Deployment Verification

### Immediate Checks (First 5 Minutes)

- [ ] Convex deployment is healthy
- [ ] No errors in Convex logs
- [ ] Existing functionality still works:
  - [ ] User login
  - [ ] Exam taking
  - [ ] Dashboard access

### Short-Term Checks (First Hour)

- [ ] Monitor Convex logs for webhook events
- [ ] Check `webhookEvents` table for new entries
- [ ] Verify no unexpected errors

### 24-Hour Checks

- [ ] Cron jobs ran successfully:
  - [ ] Check `jobsMeta` table for run counts
  - [ ] Verify `check subscription expirations` ran 4 times
- [ ] No performance degradation
- [ ] No user-reported issues

## End-to-End Cancellation Test

### Prerequisites
- Test user account with active Dodo subscription
- Access to Dodo customer portal

### Test Steps

1. **Before Cancellation**
   - [ ] Login as test user
   - [ ] Verify subscription_status = 'active' in profile
   - [ ] Note current timestamp

2. **Cancel Subscription**
   - [ ] Go to Dodo customer portal
   - [ ] Cancel subscription
   - [ ] Note cancellation timestamp

3. **Webhook Processing (Backend)**
   - [ ] Within 10 seconds, check Convex logs
   - [ ] Look for: `[Webhook] Processing cancellation event`
   - [ ] Verify: `[Webhook] Sent cancellation notification to user`
   - [ ] Check `webhookEvents` table for event record

4. **Database Update (Supabase)**
   - [ ] Query profiles table
   - [ ] Verify subscription_status = 'cancelled'
   - [ ] Check notifications table for cancellation notification

5. **Frontend Update (Real-Time)**
   - [ ] Watch app UI (no refresh)
   - [ ] Within 10 seconds, verify:
     - [ ] Notification appears: "Subscription Cancelled"
     - [ ] Subscription status shows 'cancelled'
     - [ ] Features are blocked/upgrade prompt shown

6. **Sync State Tracking**
   - [ ] Query `subscriptionSync` table
   - [ ] Verify entry for test user with:
     - `last_status: 'cancelled'`
     - `sync_source: 'webhook'`
     - `error_count: 0`

## Rollback Procedure (If Needed)

### Step 1: Revert Convex Deployment

```bash
# Get deployment history
npx convex deployments list

# Rollback to previous deployment
npx convex deployments rollback <previous-deployment-id>
```

### Step 2: Disable New Cron Jobs

**Option A: Via Dashboard**
1. Go to Convex Dashboard → Crons
2. Pause/Delete:
   - `check subscription expirations`
   - `cleanup old webhooks`

**Option B: Via Code**
```typescript
// In frontend/convex/crons.ts, comment out:
// crons.interval("check subscription expirations", ...)
// crons.weekly("cleanup old webhooks", ...)
```

Then redeploy.

### Step 3: Monitor

- [ ] Verify rollback successful
- [ ] Check existing functionality works
- [ ] Review errors that caused rollback
- [ ] Plan fixes

## Success Criteria

### Required (MUST PASS)
- [x] Convex deployment succeeds without errors
- [ ] All new tables created successfully
- [ ] Cron jobs scheduled correctly
- [ ] Webhook endpoint accessible
- [ ] Test cancellation flow works end-to-end
- [ ] No errors in logs after 1 hour

### Optional (NICE TO HAVE)
- [ ] Subscription stats query returns accurate data
- [ ] Webhook deduplication tested with duplicate webhook
- [ ] Manual cron trigger works
- [ ] 24 hours of stable operation

## Monitoring Dashboard Setup

### Recommended Checks

**Every Day (First Week)**:
- [ ] Check Convex logs for errors
- [ ] Verify cron jobs are running (4x per day for expiration check)
- [ ] Check `subscriptionSync` table for high error_count entries
- [ ] Review webhook processing latency

**Weekly**:
- [ ] Run subscription stats query
- [ ] Check webhook cleanup job ran successfully
- [ ] Verify no orphaned subscriptions (expired but still active)

**Monthly**:
- [ ] Review `webhookEvents` table size
- [ ] Analyze subscription cancellation patterns
- [ ] Check for any duplicate webhook issues

## Emergency Contacts

**If issues occur**:

1. **Check Logs**:
   - Convex: https://dashboard.convex.dev/<project>/logs
   - Supabase: https://supabase.com/dashboard/project/<id>/logs

2. **Common Issues**:
   - **Webhook not received**: Check Dodo webhook configuration
   - **Duplicate processing**: Check `webhookEvents` table has records
   - **Cancellation not syncing**: Review user resolution logic in logs
   - **Cron not running**: Check cron schedule in Convex dashboard

3. **Escalation**:
   - Review: `SUBSCRIPTION_FIXES_SUMMARY.md`
   - Check: Test script output
   - Debug: Enable verbose logging in http.ts

## Completion Sign-Off

**Deployed By**: _________________
**Date**: _________________
**Time**: _________________

**Checklist Completion**:
- [ ] All pre-deployment steps completed
- [ ] Deployment successful
- [ ] Post-deployment verification passed
- [ ] End-to-end test successful
- [ ] Monitoring setup complete

**Notes**:
_____________________________________________
_____________________________________________
_____________________________________________

**Production Ready**: ☐ YES  ☐ NO (explain below)

---

## Quick Reference

### Key Files Changed
- `frontend/convex/schema.ts` - Database schema
- `frontend/convex/http.ts` - Webhook handler
- `frontend/convex/crons.ts` - Cron job configuration
- `frontend/convex/cronHandlers.ts` - Cron handlers
- `frontend/convex/webhookHelpers.ts` - NEW
- `frontend/convex/subscriptionQueries.ts` - NEW

### Environment Variables Required
```env
# Convex
DODO_WEBHOOK_SECRET=whsec_...
DODO_PAYMENTS_API_KEY=test_... or live_...
SUPABASE_URL=https://...supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJh...

# Dodo Dashboard
Webhook URL: https://<deployment>.site/dodoWebhook
```

### Important URLs
- Convex Dashboard: https://dashboard.convex.dev
- Dodo Dashboard: https://dashboard.dodopayments.com
- Supabase Dashboard: https://supabase.com/dashboard
- Documentation: `SUBSCRIPTION_FIXES_SUMMARY.md`
