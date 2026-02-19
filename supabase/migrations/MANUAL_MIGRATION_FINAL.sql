-- ============================================================================= 
-- MANUAL SUBSCRIPTION SYSTEM MIGRATION - FINAL VERSION
-- Date: 2026-02-19
-- Purpose: Complete database migration for subscription system fixes
-- 
-- Instructions: Copy this entire script into Supabase SQL Editor and execute
-- =============================================================================

-- =============================================================================
-- STEP 1: Drop all existing versions of subscription functions
-- =============================================================================
-- This handles the "function name is not unique" error by dropping ALL versions

DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all versions of extend_subscription
    FOR r IN 
        SELECT oid::regprocedure
        FROM pg_proc 
        WHERE proname = 'extend_subscription'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.oid::regprocedure || ' CASCADE';
        RAISE NOTICE 'Dropped function: %', r.oid::regprocedure;
    END LOOP;
    
    -- Drop all versions of cancel_subscription
    FOR r IN 
        SELECT oid::regprocedure
        FROM pg_proc 
        WHERE proname = 'cancel_subscription'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.oid::regprocedure || ' CASCADE';
        RAISE NOTICE 'Dropped function: %', r.oid::regprocedure;
    END LOOP;
END $$;

-- =============================================================================
-- STEP 2: Clean invalid subscription_status values
-- =============================================================================
-- Update any invalid values to NULL before adding constraint

UPDATE profiles
SET subscription_status = NULL
WHERE subscription_status IS NOT NULL 
  AND subscription_status NOT IN ('active', 'cancelled', 'expired', 'payment_failed', 'trialing');

-- =============================================================================
-- STEP 3: Add billing_cycle column to profiles
-- =============================================================================

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS billing_cycle text
CHECK (billing_cycle IS NULL OR billing_cycle IN ('monthly', 'yearly'));

COMMENT ON COLUMN profiles.billing_cycle IS
'Current billing interval: monthly (30 days) or yearly (365 days). NULL for free users.';

-- =============================================================================
-- STEP 4: Add subscription_status CHECK constraint
-- =============================================================================

DO $$ 
BEGIN
    ALTER TABLE profiles ADD CONSTRAINT chk_subscription_status
    CHECK (subscription_status IS NULL OR subscription_status IN ('active', 'cancelled', 'expired', 'payment_failed', 'trialing'));
EXCEPTION 
    WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- STEP 5: Add composite index for cron expiration queries
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_sub_status_end_date
ON profiles(subscription_status, subscription_end_date)
WHERE subscription_status IS NOT NULL;

-- =============================================================================
-- STEP 6: Add foreign key constraint on payments.user_id
-- =============================================================================

DO $$ 
BEGIN
    ALTER TABLE payments ADD CONSTRAINT fk_payments_user_id
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;
EXCEPTION 
    WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- STEP 7: Add unique constraint on merchant_reference per provider
-- =============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_unique_merchant_ref
ON payments(provider, merchant_reference)
WHERE merchant_reference IS NOT NULL;

-- =============================================================================
-- STEP 8: Create subscription_audit_log table
-- =============================================================================

CREATE TABLE IF NOT EXISTS subscription_audit_log (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    action text NOT NULL CHECK (action IN ('extend', 'cancel', 'renew', 'downgrade', 'upgrade')),
    days_added INTEGER,
    old_end_date TIMESTAMPTZ,
    new_end_date TIMESTAMPTZ,
    old_status text,
    new_status text,
    reason text,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by text DEFAULT 'system'
);

CREATE INDEX IF NOT EXISTS idx_audit_user_created 
ON subscription_audit_log(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_action_created 
ON subscription_audit_log(action, created_at DESC);

COMMENT ON TABLE subscription_audit_log IS
'Complete audit trail of all subscription changes for debugging and compliance';

-- =============================================================================
-- STEP 9: Create failed_activations table
-- =============================================================================

CREATE TABLE IF NOT EXISTS failed_activations (
    id BIGSERIAL PRIMARY KEY,
    payment_reference text,
    dodo_customer_id text,
    error_message text NOT NULL,
    payment_data JSONB,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolved_by text
);

CREATE INDEX IF NOT EXISTS idx_failed_activations_unresolved 
ON failed_activations(created_at DESC)
WHERE resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_failed_activations_dodo_customer 
ON failed_activations(dodo_customer_id)
WHERE resolved_at IS NULL;

COMMENT ON TABLE failed_activations IS
'Records subscription activation failures for manual recovery and debugging';

-- =============================================================================
-- STEP 10: Create extend_subscription RPC function
-- =============================================================================

CREATE OR REPLACE FUNCTION extend_subscription(
    p_user_id UUID,
    p_days INTEGER,
    p_reason text DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_old_end_date TIMESTAMPTZ;
    v_new_end_date TIMESTAMPTZ;
    v_old_status text;
    v_new_status text;
BEGIN
    -- Lock the row to prevent race conditions
    SELECT subscription_end_date, subscription_status
    INTO v_old_end_date, v_old_status
    FROM profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found: %', p_user_id;
    END IF;

    -- Calculate new end date
    IF v_old_end_date IS NULL OR v_old_end_date < NOW() THEN
        v_new_end_date := NOW() + (p_days || ' days')::INTERVAL;
    ELSE
        v_new_end_date := v_old_end_date + (p_days || ' days')::INTERVAL;
    END IF;

    v_new_status := 'active';

    -- Update subscription
    UPDATE profiles
    SET subscription_end_date = v_new_end_date,
        subscription_status = v_new_status,
        updated_at = NOW()
    WHERE id = p_user_id;

    -- Log to audit trail
    INSERT INTO subscription_audit_log(
        user_id, action, days_added, 
        old_end_date, new_end_date,
        old_status, new_status,
        reason, metadata
    ) VALUES (
        p_user_id, 'extend', p_days,
        v_old_end_date, v_new_end_date,
        v_old_status, v_new_status,
        p_reason, p_metadata
    );
END;
$$;

COMMENT ON FUNCTION extend_subscription IS
'Extends user subscription by specified days with audit logging and race condition protection';

-- =============================================================================
-- STEP 11: Create cancel_subscription RPC function
-- =============================================================================

CREATE OR REPLACE FUNCTION cancel_subscription(
    p_user_id UUID,
    p_reason text DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_old_end_date TIMESTAMPTZ;
    v_old_status text;
BEGIN
    -- Lock the row
    SELECT subscription_end_date, subscription_status
    INTO v_old_end_date, v_old_status
    FROM profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found: %', p_user_id;
    END IF;

    -- Update to cancelled status
    UPDATE profiles
    SET subscription_status = 'cancelled',
        updated_at = NOW()
    WHERE id = p_user_id;

    -- Log to audit trail
    INSERT INTO subscription_audit_log(
        user_id, action,
        old_end_date, new_end_date,
        old_status, new_status,
        reason, metadata
    ) VALUES (
        p_user_id, 'cancel',
        v_old_end_date, v_old_end_date,
        v_old_status, 'cancelled',
        p_reason, p_metadata
    );
END;
$$;

COMMENT ON FUNCTION cancel_subscription IS
'Cancels user subscription with audit logging';

-- =============================================================================
-- STEP 12: Create auto-expiration trigger
-- =============================================================================

CREATE OR REPLACE FUNCTION auto_expire_subscriptions()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.subscription_end_date < NOW() 
       AND NEW.subscription_status = 'active' THEN
        NEW.subscription_status := 'expired';
        
        INSERT INTO subscription_audit_log(
            user_id, action,
            old_end_date, new_end_date,
            old_status, new_status,
            reason
        ) VALUES (
            NEW.id, 'expire',
            NEW.subscription_end_date, NEW.subscription_end_date,
            'active', 'expired',
            'Automatic expiration on update'
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_expire_subscriptions ON profiles;

CREATE TRIGGER trigger_auto_expire_subscriptions
BEFORE UPDATE ON profiles
FOR EACH ROW
WHEN (OLD.subscription_end_date IS DISTINCT FROM NEW.subscription_end_date 
      OR OLD.subscription_status IS DISTINCT FROM NEW.subscription_status)
EXECUTE FUNCTION auto_expire_subscriptions();

-- =============================================================================
-- STEP 13: Grant necessary permissions
-- =============================================================================

GRANT SELECT, INSERT ON subscription_audit_log TO authenticated, anon, service_role;
GRANT SELECT, INSERT, UPDATE ON failed_activations TO authenticated, anon, service_role;
GRANT USAGE, SELECT ON SEQUENCE subscription_audit_log_id_seq TO authenticated, anon, service_role;
GRANT USAGE, SELECT ON SEQUENCE failed_activations_id_seq TO authenticated, anon, service_role;

-- Grant execute permissions on RPC functions
GRANT EXECUTE ON FUNCTION extend_subscription TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION cancel_subscription TO authenticated, service_role;

-- =============================================================================
-- VERIFICATION QUERY
-- =============================================================================
-- Run this after the migration to verify everything was created successfully

SELECT 
    'RPC Function' as object_type,
    p.proname as name,
    pg_get_function_identity_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname IN ('extend_subscription', 'cancel_subscription')

UNION ALL

SELECT 
    'Table' as object_type,
    tablename as name,
    '' as arguments
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('subscription_audit_log', 'failed_activations')

UNION ALL

SELECT 
    'Column' as object_type,
    'profiles.billing_cycle' as name,
    data_type as arguments
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name = 'billing_cycle'

ORDER BY object_type, name;

-- Expected result: 5 rows
-- 2 RPC Functions: extend_subscription, cancel_subscription
-- 2 Tables: subscription_audit_log, failed_activations  
-- 1 Column: profiles.billing_cycle
