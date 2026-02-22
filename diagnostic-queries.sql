-- Subscription Deactivation Diagnostic Queries
-- Run these in Supabase SQL Editor to diagnose issues

-- ============================================
-- 1. CHECK USER EXISTS AND CURRENT STATUS
-- ============================================
-- Replace 'user@example.com' with actual email
SELECT
    id,
    email,
    subscription_status,
    subscription_end_date,
    dodo_customer_id,
    created_at
FROM profiles
WHERE email = 'user@example.com';

-- Expected output:
-- - id: Should exist
-- - subscription_status: Should be 'cancelled' or 'expired' if deactivation worked
-- - dodo_customer_id: Should NOT be NULL (important for webhook routing)


-- ============================================
-- 2. CHECK ALL USERS WITH ACTIVE EXPIRED SUBSCRIPTIONS
-- ============================================
-- Find users who should be expired but still show as active
SELECT
    id,
    email,
    subscription_status,
    subscription_end_date,
    DATE_PART('day', NOW() - subscription_end_date) as days_expired
FROM profiles
WHERE subscription_status = 'active'
  AND subscription_end_date IS NOT NULL
  AND subscription_end_date < NOW()
ORDER BY subscription_end_date ASC;

-- If this returns rows, expiration cron is not working!


-- ============================================
-- 3. CHECK RECENT PAYMENTS FROM DODO
-- ============================================
SELECT
    user_id,
    user_email,
    merchant_reference,
    provider,
    status,
    amount,
    created_at,
    metadata
FROM payments
WHERE provider = 'dodo'
ORDER BY created_at DESC
LIMIT 20;

-- Verify:
-- - Payments are being recorded
-- - user_id and user_email are populated
-- - metadata contains subscriptionId


-- ============================================
-- 4. CHECK NOTIFICATIONS (WERE THEY SENT?)
-- ============================================
SELECT
    user_id,
    title,
    message,
    type,
    is_read,
    created_at
FROM notifications
WHERE title LIKE '%Subscription%'
  OR title LIKE '%Cancelled%'
  OR title LIKE '%Payment%'
ORDER BY created_at DESC
LIMIT 20;

-- If cancellation happened but no notification, webhook processing failed partially


-- ============================================
-- 5. FIND USERS WITHOUT dodo_customer_id
-- ============================================
-- These users cannot be updated via webhook automatically
SELECT
    id,
    email,
    subscription_status,
    created_at
FROM profiles
WHERE subscription_status IN ('active', 'payment_failed')
  AND dodo_customer_id IS NULL
ORDER BY created_at DESC;

-- FIX: Link their dodo_customer_id manually


-- ============================================
-- 6. CHECK RPC FUNCTION EXISTS
-- ============================================
-- Verify cancel_subscription RPC is defined
SELECT
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('cancel_subscription', 'extend_subscription');

-- Should return both functions
-- If missing, RPC approach will fail (but direct update still works)


-- ============================================
-- 7. EMERGENCY: MANUALLY CANCEL SUBSCRIPTION
-- ============================================
-- Use this if webhook failed and you need immediate deactivation

-- UPDATE profiles
-- SET
--     subscription_status = 'cancelled',
--     subscription_end_date = NULL
-- WHERE email = 'user@example.com';  -- REPLACE WITH ACTUAL EMAIL

-- Verify:
-- SELECT subscription_status FROM profiles WHERE email = 'user@example.com';


-- ============================================
-- 8. EMERGENCY: MANUALLY EXPIRE ALL EXPIRED SUBSCRIPTIONS
-- ============================================
-- Run this if cron jobs are not working

-- UPDATE profiles
-- SET subscription_status = 'expired'
-- WHERE subscription_status = 'active'
--   AND subscription_end_date IS NOT NULL
--   AND subscription_end_date < NOW();

-- Check how many:
-- SELECT COUNT(*) FROM profiles
-- WHERE subscription_status = 'active'
--   AND subscription_end_date < NOW();


-- ============================================
-- 9. LINK dodo_customer_id FOR USER
-- ============================================
-- If user missing dodo_customer_id, add it manually

-- First, find customer ID from Dodo Dashboard → Customers → Search by email
-- Then run:

-- UPDATE profiles
-- SET dodo_customer_id = 'cus_...'  -- Replace with actual customer ID from Dodo
-- WHERE email = 'user@example.com';

-- Verify:
-- SELECT dodo_customer_id FROM profiles WHERE email = 'user@example.com';


-- ============================================
-- 10. CHECK SUBSCRIPTION STATISTICS
-- ============================================
-- Overview of all subscription statuses
SELECT
    subscription_status,
    COUNT(*) as count,
    COUNT(*) FILTER (WHERE subscription_end_date < NOW()) as expired_but_not_updated
FROM profiles
WHERE subscription_status IS NOT NULL
GROUP BY subscription_status
ORDER BY count DESC;

-- Healthy system should have:
-- - Very few or zero in 'expired_but_not_updated' column
-- - Most users in 'active' or NULL


-- ============================================
-- 11. FIND RECENT PROFILE UPDATES
-- ============================================
-- Check if ANY profile updates are happening
SELECT
    id,
    email,
    subscription_status,
    subscription_end_date,
    updated_at
FROM profiles
WHERE updated_at > NOW() - INTERVAL '24 hours'
  AND subscription_status IS NOT NULL
ORDER BY updated_at DESC
LIMIT 20;

-- If no recent updates, webhook is definitely not working


-- ============================================
-- 12. TEST DATABASE WRITE PERMISSION
-- ============================================
-- Ensure service role can write to profiles

-- First, create a test user (or use existing)
-- Then try to update:

-- UPDATE profiles
-- SET subscription_status = 'cancelled'
-- WHERE id = '<test-user-id>';

-- If this fails with permission error:
-- - Check RLS policies
-- - Verify you're using service_role key
-- - Check that profiles table allows updates


-- ============================================
-- 13. CLEANUP TEST DATA (OPTIONAL)
-- ============================================
-- Remove test webhook events or test users

-- DELETE FROM payments WHERE merchant_reference LIKE 'sub_test_%';
-- DELETE FROM notifications WHERE title LIKE '%Test%';


-- ============================================
-- 14. AUDIT TRAIL: FIND WHO/WHAT LAST UPDATED USER
-- ============================================
-- (Requires audit logging to be enabled)

-- SELECT *
-- FROM audit.record_version
-- WHERE table_name = 'profiles'
--   AND record_id = '<user-id>'
-- ORDER BY created_at DESC
-- LIMIT 10;

-- If audit logging not enabled, check application logs instead
