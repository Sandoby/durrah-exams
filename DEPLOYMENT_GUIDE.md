# 🚀 Deployment Guide - Subscription System Fixes

**Date:** February 19, 2026

---

## Quick Deployment Checklist

- [ ] 1. Apply database migration (5 min)
- [ ] 2. Deploy Convex backend (3 min)
- [ ] 3. Deploy frontend (5 min)
- [ ] 4. Test critical flows (10 min)
- [ ] 5. Monitor for 24-48 hours

**Total Time:** ~25 minutes

---

## Step 1: Apply Database Migration

### Option A: Via Supabase CLI (Recommended)
```powershell
cd "c:\Users\Elsaid Ahmed\Desktop\durrah exams new"
supabase db push
```

### Option B: Via Supabase Dashboard
1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT/sql-editor
2. Copy contents of `supabase/migrations/20260219000000_subscription_system_fixes.sql`
3. Paste and click "Run"

### Verify Migration Success
```sql
-- Check if RPC functions were created
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('extend_subscription', 'cancel_subscription');

-- Should return 2 rows

-- Check if new tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('subscription_audit_log', 'failed_activations');

-- Should return 2 rows

-- Check if billing_cycle column was added
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'billing_cycle';

-- Should return 1 row
```

---

## Step 2: Deploy Convex Backend

```powershell
cd "c:\Users\Elsaid Ahmed\Desktop\durrah exams new\frontend"
npx convex deploy
```

### Expected Output
```
✓ Deploying functions...
✓ Deployed 15 functions
✓ Running codegen...
✓ Done
```

### Verify Convex Deployment
1. Go to https://dashboard.convex.dev
2. Check "Functions" tab
3. Verify `dodoPayments.ts` and `http.ts` functions were updated

---

## Step 3: Deploy Frontend

### If using Vercel
```powershell
cd "c:\Users\Elsaid Ahmed\Desktop\durrah exams new\frontend"
npm run build
vercel --prod
```

### If using Netlify
```powershell
cd "c:\Users\Elsaid Ahmed\Desktop\durrah exams new\frontend"
npm run build
netlify deploy --prod
```

### If using another host
```powershell
cd "c:\Users\Elsaid Ahmed\Desktop\durrah exams new\frontend"
npm run build
# Upload contents of 'dist' folder to your host
```

---

## Step 4: Post-Deployment Testing

### Test 1: Database Functions
```sql
-- Test extend_subscription (safe with test user)
SELECT extend_subscription(
    '<test_user_id>', 
    NULL, 
    30, 
    'Professional', 
    'deployment_test'
);

-- Check audit log
SELECT * FROM subscription_audit_log 
WHERE user_id = '<test_user_id>' 
ORDER BY created_at DESC 
LIMIT 1;
```

### Test 2: New Subscription Flow
1. Go to `/checkout` page
2. Select Monthly plan
3. Complete payment with test card
4. Verify:
   - ✅ Subscription activates
   - ✅ `billing_cycle = 'monthly'` in database
   - ✅ Entry in `subscription_audit_log`

### Test 3: Settings Page
1. Go to `/settings`
2. Check Subscription section
3. Verify:
   - ✅ Plan name shows "Professional"
   - ✅ Billing cycle shows "Billed Monthly" or "Billed Annually"
   - ✅ "Manage Subscription" button works

### Test 4: Pricing Display
1. Go to `/pricing`
2. Verify:
   - ✅ Yearly plan shows "SAVE 17%" (not 20%)

### Test 5: Webhook Error Handling
1. Trigger a test webhook with invalid data
2. Check Convex logs
3. Verify:
   - ✅ Returns HTTP 500 (not 200)
   - ✅ Entry in `failed_activations` table

---

## Step 5: Monitoring (First 48 Hours)

### Check Failed Activations
```sql
SELECT * FROM failed_activations 
WHERE created_at > NOW() - INTERVAL '48 hours'
AND status = 'pending_resolution';
```

### Check Subscription Audit Log
```sql
SELECT 
    action,
    COUNT(*) as count,
    DATE(created_at) as date
FROM subscription_audit_log 
WHERE created_at > NOW() - INTERVAL '48 hours'
GROUP BY action, DATE(created_at)
ORDER BY date DESC, count DESC;
```

### Check Convex Logs
1. Go to https://dashboard.convex.dev
2. Check "Logs" tab
3. Look for errors in `dodoPayments` or `http` functions

---

## Rollback Plan (If Issues Occur)

### Rollback Database
```sql
-- Drop new tables (keeps existing data)
DROP TABLE IF EXISTS failed_activations CASCADE;
DROP TABLE IF EXISTS subscription_audit_log CASCADE;

-- Drop RPC functions
DROP FUNCTION IF EXISTS extend_subscription CASCADE;
DROP FUNCTION IF EXISTS cancel_subscription CASCADE;

-- Remove billing_cycle column
ALTER TABLE profiles DROP COLUMN IF EXISTS billing_cycle;
```

### Rollback Convex
```powershell
cd frontend
git checkout HEAD~1 convex/dodoPayments.ts convex/http.ts
npx convex deploy
```

### Rollback Frontend
```powershell
cd frontend
git checkout HEAD~1 src/
npm run build
# Redeploy
```

---

## Common Issues & Solutions

### Issue 1: Migration fails with "column already exists"
**Solution:** Column was added manually before. Safe to ignore or use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`

### Issue 2: RPC function fails with "permission denied"
**Solution:** Check RLS policies. RPCs use `SECURITY DEFINER`, should work by default

### Issue 3: Convex deploy fails
**Solution:** 
```powershell
npx convex dev --once  # Test locally first
npx convex deploy --debug
```

### Issue 4: Frontend build fails
**Solution:**
```powershell
rm -rf node_modules
npm install
npm run build
```

---

## Environment Variables Checklist

Ensure these are set in your deployment:

### Convex (via dashboard.convex.dev)
- ✅ `DODO_PAYMENTS_API_KEY`
- ✅ `DODO_WEBHOOK_SECRET`
- ✅ `SUPABASE_URL`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`

### Frontend (via Vercel/Netlify dashboard)
- ✅ `VITE_CONVEX_URL`
- ✅ `VITE_SUPABASE_URL`
- ✅ `VITE_SUPABASE_ANON_KEY`

---

## Success Criteria

### Deployment is successful if:
1. ✅ All database migrations applied without errors
2. ✅ New RPC functions callable from SQL
3. ✅ Convex functions deployed and callable
4. ✅ Frontend builds without errors
5. ✅ Test subscription flow works end-to-end
6. ✅ Settings page shows billing cycle
7. ✅ Pricing page shows correct discount

### Monitor for 48 hours:
- No entries in `failed_activations` table (or if there are, investigate immediately)
- All `subscription_audit_log` entries look correct
- No spike in Convex errors
- Users report successful activations

---

## Support Contacts

If deployment issues occur:
1. Check this guide's rollback section
2. Check Convex logs at dashboard.convex.dev
3. Check Supabase logs at supabase.com/dashboard
4. Review error messages in browser console

---

## Post-Deployment Actions (Next 7 Days)

### Day 1-2
- [ ] Monitor `failed_activations` table hourly
- [ ] Check Convex error logs twice daily
- [ ] Test a few real subscription flows manually

### Day 3-7
- [ ] Monitor `failed_activations` daily
- [ ] Review subscription_audit_log for patterns
- [ ] Collect user feedback on checkout experience

### Week 2+
- [ ] Review accumulated audit logs
- [ ] Plan implementation of admin panel for failed activations
- [ ] Consider optional code cleanup (remove Kashier/PaySky)

---

## Notes

- All changes are backward compatible
- Existing subscriptions continue to work
- No user action required
- No downtime expected during deployment
