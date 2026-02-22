-- Fix invalid subscription_status values before adding constraint
-- This handles any legacy data with invalid statuses

UPDATE profiles 
SET subscription_status = NULL
WHERE subscription_status IS NOT NULL 
  AND subscription_status NOT IN ('active', 'cancelled', 'expired', 'payment_failed', 'trialing');
