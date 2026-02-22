-- Subscription System Fixes Migration
-- Date: 2026-02-19
-- Purpose: Add missing RPC functions, tables, constraints, and indexes for robust subscription management

-- =============================================================================
-- 1. Add billing_cycle column to profiles
-- =============================================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS billing_cycle text
CHECK (billing_cycle IS NULL OR billing_cycle IN ('monthly', 'yearly'));

COMMENT ON COLUMN profiles.billing_cycle IS
'Current billing interval: monthly (30 days) or yearly (365 days). NULL for free users.';

-- =============================================================================
-- 2. Add subscription_status CHECK constraint
-- =============================================================================
-- COMMENTED OUT - Will be added after data cleanup in migration 20260219000002
-- DO $$ BEGIN
--     ALTER TABLE profiles ADD CONSTRAINT chk_subscription_status
--     CHECK (subscription_status IS NULL OR subscription_status IN ('active', 'cancelled', 'expired', 'payment_failed', 'trialing'));
-- EXCEPTION 
--     WHEN duplicate_object THEN NULL;
-- END $$;

-- =============================================================================
-- 3. Add composite index for cron expiration queries
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_sub_status_end_date
ON profiles(subscription_status, subscription_end_date)
WHERE subscription_status IS NOT NULL;

-- =============================================================================
-- 4. Add foreign key constraint on payments.user_id
-- =============================================================================
DO $$ BEGIN
    ALTER TABLE payments ADD CONSTRAINT fk_payments_user_id
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;
EXCEPTION 
    WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- 5. Add unique constraint on merchant_reference per provider
-- =============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_unique_merchant_ref
ON payments(provider, merchant_reference)
WHERE merchant_reference IS NOT NULL;

-- =============================================================================
-- 6. Create subscription_audit_log table
-- =============================================================================
CREATE TABLE IF NOT EXISTS subscription_audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    agent_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
    action text NOT NULL CHECK (action IN ('extend', 'cancel', 'expire', 'trial_start', 'trial_end', 'payment_failed', 'reactivate')),
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
CREATE INDEX IF NOT EXISTS idx_audit_action ON subscription_audit_log(action);

COMMENT ON TABLE subscription_audit_log IS 
'Audit trail for all subscription state changes including extensions, cancellations, and expirations';

-- =============================================================================
-- 7. Create failed_activations table
-- =============================================================================
CREATE TABLE IF NOT EXISTS failed_activations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    dodo_subscription_id text,
    dodo_customer_id text,
    customer_email text,
    event_type text,
    webhook_payload jsonb,
    error_message text,
    status text DEFAULT 'pending_resolution'
        CHECK (status IN ('pending_resolution', 'resolved', 'ignored')),
    resolved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
    resolved_at timestamptz,
    resolution_notes text,
    created_at timestamptz DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_failed_act_status ON failed_activations(status);
CREATE INDEX IF NOT EXISTS idx_failed_act_created ON failed_activations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_failed_act_email ON failed_activations(customer_email);

COMMENT ON TABLE failed_activations IS 
'Tracks subscription activation failures when user resolution fails - enables manual recovery';

-- =============================================================================
-- 8. Create or replace extend_subscription RPC function
-- =============================================================================
CREATE OR REPLACE FUNCTION extend_subscription(
    p_user_id uuid,
    p_agent_id uuid DEFAULT NULL,
    p_days integer DEFAULT 30,
    p_plan text DEFAULT 'Professional',
    p_reason text DEFAULT 'subscription_payment'
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_end timestamptz;
    v_new_end timestamptz;
    v_profile record;
BEGIN
    -- Lock the profile row for update
    SELECT subscription_end_date, subscription_status, subscription_plan, billing_cycle
    INTO v_profile
    FROM profiles 
    WHERE id = p_user_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;

    -- Calculate new end date: extend from MAX(current_end, now) to prevent past-date issues
    v_current_end := GREATEST(COALESCE(v_profile.subscription_end_date, NOW()), NOW());
    v_new_end := v_current_end + (p_days || ' days')::interval;

    -- Update profile with new subscription info
    UPDATE profiles SET
        subscription_status = 'active',
        subscription_plan = p_plan,
        subscription_end_date = v_new_end,
        updated_at = NOW()
    WHERE id = p_user_id;

    -- Log the action in audit trail
    INSERT INTO subscription_audit_log (
        user_id, 
        agent_id, 
        action, 
        days, 
        plan, 
        reason, 
        old_end_date, 
        new_end_date,
        metadata
    ) VALUES (
        p_user_id, 
        p_agent_id, 
        'extend', 
        p_days, 
        p_plan, 
        p_reason, 
        v_profile.subscription_end_date, 
        v_new_end,
        json_build_object(
            'old_status', v_profile.subscription_status,
            'old_plan', v_profile.subscription_plan
        )
    );

    RETURN json_build_object(
        'success', true,
        'new_end_date', v_new_end,
        'days_added', p_days,
        'plan', p_plan,
        'previous_end_date', v_profile.subscription_end_date
    );
END;
$$;

COMMENT ON FUNCTION extend_subscription IS 
'Extends a user subscription by specified days. Extends from MAX(current_end, now).';

-- =============================================================================
-- 9. Create or replace cancel_subscription RPC function
-- =============================================================================
CREATE OR REPLACE FUNCTION cancel_subscription(
    p_user_id uuid,
    p_agent_id uuid DEFAULT NULL,
    p_reason text DEFAULT 'user_cancelled'
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_profile record;
BEGIN
    -- Lock the profile row for update
    SELECT subscription_status, subscription_end_date, subscription_plan, billing_cycle
    INTO v_profile
    FROM profiles 
    WHERE id = p_user_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;

    -- Update profile to cancelled status
    UPDATE profiles SET
        subscription_status = 'cancelled',
        updated_at = NOW()
    WHERE id = p_user_id;

    -- Log the cancellation in audit trail
    INSERT INTO subscription_audit_log (
        user_id, 
        agent_id, 
        action, 
        plan, 
        reason, 
        old_end_date,
        metadata
    ) VALUES (
        p_user_id, 
        p_agent_id, 
        'cancel', 
        v_profile.subscription_plan, 
        p_reason, 
        v_profile.subscription_end_date,
        json_build_object(
            'old_status', v_profile.subscription_status,
            'billing_cycle', v_profile.billing_cycle
        )
    );

    RETURN json_build_object(
        'success', true, 
        'previous_status', v_profile.subscription_status,
        'previous_end_date', v_profile.subscription_end_date
    );
END;
$$;

COMMENT ON FUNCTION cancel_subscription IS 
'Cancels a user subscription. Sets status to cancelled, preserves end_date for access until expiry.';

-- =============================================================================
-- 10. Create updated_at trigger for profiles
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at 
BEFORE UPDATE ON profiles
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 11. Add provider_response column to unify Kashier/PaySky columns
-- =============================================================================
ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider_response jsonb;

-- Migrate existing data from Kashier/PaySky columns if they exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'payments' AND column_name = 'kashier_response') THEN
        UPDATE payments 
        SET provider_response = kashier_response 
        WHERE kashier_response IS NOT NULL AND provider_response IS NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'payments' AND column_name = 'paysky_response') THEN
        UPDATE payments 
        SET provider_response = paysky_response 
        WHERE paysky_response IS NOT NULL AND provider_response IS NULL;
    END IF;
END $$;

-- =============================================================================
-- 12. Grant necessary permissions
-- =============================================================================
-- Grant execute permissions on RPC functions to authenticated users
GRANT EXECUTE ON FUNCTION extend_subscription TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_subscription TO authenticated;

-- Grant appropriate table permissions
GRANT SELECT ON subscription_audit_log TO authenticated;
GRANT SELECT ON failed_activations TO authenticated;

-- Grant admin/service role full access
GRANT ALL ON subscription_audit_log TO service_role;
GRANT ALL ON failed_activations TO service_role;
