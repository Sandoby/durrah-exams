# 🔴 TROUBLESHOOTING: Subscription Not Deactivating

## Symptoms
- User cancels subscription in Dodo portal
- OR subscription expires
- But subscription_status remains 'active' in database
- User still has access to premium features

---

## Step-by-Step Diagnosis

### Step 1: Check if Webhook is Reaching Server

**Go to**: Convex Dashboard → Logs

**Search for**: `Processing Dodo event`

**Possible outcomes**:

#### ✅ You see: `Processing Dodo event: subscription.cancelled`
→ Webhook IS reaching server. Go to **Step 2**.

#### ❌ You see: Nothing / No logs
→ Webhook is NOT reaching server.

**Fix**:
1. Check Dodo webhook configuration:
   - URL: `https://<your-deployment>.site/dodoWebhook`
   - Events: `subscription.cancelled`, `subscription.expired` must be checked

2. Send test webhook from Dodo dashboard:
   - Go to Dodo Dashboard → Webhooks
   - Click "Send Test Event"
   - Choose "subscription.cancelled"
   - Check if it appears in Convex logs

3. Verify Convex deployment is live:
   ```bash
   npx convex deploy
   ```

---

### Step 2: Check Signature Verification

**Search in logs for**: `Invalid Dodo webhook signature`

#### ❌ You see: `Invalid signature`
→ Webhook signature failing.

**Fix**:
1. Verify `DODO_WEBHOOK_SECRET` in Convex:
   - Go to: Convex Dashboard → Settings → Environment Variables
   - Check: `DODO_WEBHOOK_SECRET` exists
   - Value should start with: `whsec_`

2. Copy correct secret from Dodo:
   - Go to: Dodo Dashboard → Webhooks
   - Copy the "Signing Secret"
   - Update in Convex environment variables

3. Redeploy Convex:
   ```bash
   npx convex deploy
   ```

#### ✅ Signature verification passes
→ Go to **Step 3**.

---

### Step 3: Check User Resolution

**Search in logs for**: `[AUTH]` or `COULD NOT IDENTIFY USER`

**Look for**:
```
[AUTH] Successfully identified user via email: <userId>
```
OR
```
COULD NOT IDENTIFY USER for Dodo event
```

#### ❌ You see: `COULD NOT IDENTIFY USER`
→ Webhook can't find which user to update.

**Fix**:

**Option A: Check if user has dodo_customer_id**

Run in Supabase SQL Editor:
```sql
SELECT id, email, dodo_customer_id, subscription_status
FROM profiles
WHERE email = 'test@example.com'; -- Replace with actual email
```

If `dodo_customer_id` is NULL:
```sql
-- Link the customer ID manually
UPDATE profiles
SET dodo_customer_id = 'cus_...' -- Get from Dodo dashboard
WHERE email = 'test@example.com';
```

**Option B: Ensure metadata.userId in checkout**

Check checkout code sends userId:
```typescript
metadata: {
  userId: user.id,  // ← Must be present!
  billingCycle: 'monthly',
  planId: 'pro'
}
```

**Option C: Verify email matches**

Webhook uses customer email to find user. Ensure:
- Email in Dodo matches email in Supabase profiles
- Emails are lowercase (normalize if needed)

#### ✅ User resolution succeeds
→ Go to **Step 4**.

---

### Step 4: Check Database Update

**Search in logs for**: `[DB] 🔴 DEACTIVATION REQUEST`

**Then look for**:
```
[DB] ✅ Direct profile update successful
```
OR
```
[DB] ❌ CRITICAL: Direct profile update failed
```

#### ❌ You see: `Direct profile update failed`
→ Database write failing.

**Fix**:

1. **Check Supabase Service Role Key**:
   ```bash
   # In Convex Dashboard → Settings → Environment Variables
   # Verify SUPABASE_SERVICE_ROLE_KEY exists and is correct
   ```

   To get correct key:
   - Go to: Supabase Dashboard → Settings → API
   - Copy: `service_role` key (NOT anon key!)
   - Update in Convex environment variables

2. **Check RLS (Row Level Security)**:

   Service role should bypass RLS, but verify:
   ```sql
   -- In Supabase SQL Editor
   SELECT * FROM pg_policies WHERE tablename = 'profiles';
   ```

   Service role should have unrestricted access.

3. **Test manual update**:
   ```sql
   -- Run in Supabase SQL Editor with service_role key
   UPDATE profiles
   SET subscription_status = 'cancelled'
   WHERE id = '<user-id>';
   ```

   If this fails, check:
   - User ID exists
   - Column name is correct
   - No triggers blocking update

#### ✅ Database update succeeds
→ Go to **Step 5**.

---

### Step 5: Check Frontend Real-Time Sync

Even if database updated successfully, frontend might not update.

**Check**:

1. **Verify profile value in database**:
   ```sql
   SELECT subscription_status FROM profiles WHERE id = '<user-id>';
   ```

   Should show: `cancelled` or `expired`

2. **Check frontend AuthContext**:
   - Is user logged in?
   - Is Supabase Realtime connected?
   - Check browser console for errors

3. **Test manual refresh**:
   - Refresh browser page
   - Does status now show correctly?

**If manual refresh works but real-time doesn't**:

Check `AuthContext.tsx` realtime setup:
```typescript
// Should have this:
const channel = supabase
  .channel(`profile-sync-${userId}`)
  .on('postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
    (payload) => {
      setSubscriptionStatus(payload.new.subscription_status);
    }
  )
  .subscribe();
```

Verify:
- Channel is created
- Subscription is active (check browser console)
- Supabase Realtime is enabled in Supabase Dashboard → Database → Replication

---

## Common Root Causes & Quick Fixes

### 1. Webhook Not Configured
**Symptom**: No logs at all
**Fix**:
```
1. Go to Dodo Dashboard → Webhooks
2. Add endpoint: https://<deployment>.site/dodoWebhook
3. Subscribe to: subscription.* events
4. Send test event
```

### 2. Wrong Webhook Secret
**Symptom**: `Invalid signature` in logs
**Fix**:
```
1. Copy secret from Dodo Dashboard → Webhooks
2. Paste in Convex → Settings → Environment Variables → DODO_WEBHOOK_SECRET
3. Redeploy: npx convex deploy
```

### 3. User Not Found
**Symptom**: `COULD NOT IDENTIFY USER` in logs
**Fix**:
```sql
-- Link dodo_customer_id
UPDATE profiles
SET dodo_customer_id = '<from-dodo-dashboard>'
WHERE email = 'user@example.com';
```

### 4. Database Permission Issue
**Symptom**: `Direct profile update failed` in logs
**Fix**:
```
1. Verify SUPABASE_SERVICE_ROLE_KEY in Convex env vars
2. Copy correct key from Supabase → Settings → API
3. Redeploy: npx convex deploy
```

### 5. Realtime Not Working
**Symptom**: Database updated but UI doesn't change
**Fix**:
```
1. Refresh browser page (should work after refresh)
2. Enable Realtime: Supabase → Database → Replication → Enable for profiles
3. Check browser console for Realtime connection errors
```

---

## Emergency Manual Deactivation

If webhook fails and you need to deactivate immediately:

```sql
-- In Supabase SQL Editor
UPDATE profiles
SET
  subscription_status = 'cancelled',
  subscription_end_date = NULL
WHERE email = 'user@example.com';

-- Verify
SELECT id, email, subscription_status FROM profiles WHERE email = 'user@example.com';
```

User will be deactivated within seconds (via realtime sync).

---

## Testing Deactivation End-to-End

1. **Create test subscription**:
   - Use test mode in Dodo
   - Note user email and ID

2. **Monitor logs**:
   - Open Convex Dashboard → Logs
   - Keep it open in separate tab

3. **Cancel subscription**:
   - Go to Dodo customer portal
   - Cancel subscription

4. **Watch for logs** (should appear within 5-10 seconds):
   ```
   ✅ Processing Dodo event: subscription.cancelled
   ✅ [AUTH] Successfully identified user via email: <userId>
   ✅ [DB] 🔴 DEACTIVATION REQUEST for user <userId>
   ✅ [DB] Step 1: Directly updating profile status to 'cancelled'
   ✅ [DB] ✅ Direct profile update successful
   ✅ [DB] 🎉 DEACTIVATION COMPLETE
   ```

5. **Verify database**:
   ```sql
   SELECT subscription_status FROM profiles WHERE email = 'test@example.com';
   -- Should return: cancelled
   ```

6. **Verify frontend**:
   - User should see notification
   - Status should change (no refresh needed)
   - Features should be blocked

---

## Still Not Working?

### Run Complete Diagnostic:

```bash
chmod +x debug-webhook.sh
./debug-webhook.sh
```

Follow the interactive prompts.

### Collect Debug Information:

1. **Convex Logs** (last 50 lines):
   - Dashboard → Logs → Copy recent entries with "Webhook" or "DB"

2. **Database State**:
   ```sql
   SELECT id, email, subscription_status, subscription_end_date, dodo_customer_id
   FROM profiles
   WHERE email = 'affected-user@example.com';
   ```

3. **Webhook Events in Convex**:
   ```typescript
   // Run in Convex Functions
   import { query } from "./_generated/server";

   export default query(async ({ db }) => {
     return await db.query("webhookEvents")
       .order("desc")
       .take(10);
   });
   ```

4. **Dodo Webhook Attempts**:
   - Go to: Dodo Dashboard → Webhooks → Attempts
   - Check recent deliveries
   - Look for failed attempts or errors

### Contact Information Checklist:

When reporting the issue, include:
- [ ] Convex logs showing webhook reception
- [ ] Database query showing current subscription_status
- [ ] Dodo webhook attempt logs
- [ ] User email and ID (sanitized)
- [ ] Which step in diagnosis failed

---

## Prevention

To prevent future issues:

1. **Monitor webhook health**:
   - Set up alerts for failed webhooks in Dodo
   - Check Convex logs weekly

2. **Always link dodo_customer_id**:
   - During checkout, persist customer ID immediately
   - Verify it exists after payment

3. **Test in staging first**:
   - Use Dodo test mode
   - Verify complete flow before production

4. **Have backup expiration check**:
   - Convex cron runs every 6 hours (now configured!)
   - GitHub Actions runs daily at 2 AM UTC
   - At least one should catch expiries

5. **Manual sync endpoint available**:
   - Keep `/syncDodoSubscription` working
   - Can manually trigger if webhook fails
