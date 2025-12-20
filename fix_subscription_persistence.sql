-- Final Fix for Admin Subscription Management
-- This migration updates the RPC functions to use SECURITY DEFINER,
-- which allows them to bypass RLS policies when called by the Admin Panel.
-- It also ensures the subscription_plan is correctly updated.

-- 1. EXTEND SUBSCRIPTION
CREATE OR REPLACE FUNCTION public.extend_subscription(
    p_user_id UUID,
    p_agent_id UUID,
    p_days INTEGER,
    p_reason TEXT DEFAULT '',
    p_plan TEXT DEFAULT 'pro'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_end_date TIMESTAMPTZ;
    new_end_date TIMESTAMPTZ;
    v_old_plan TEXT;
BEGIN
    -- Get current subscription details
    SELECT subscription_end_date, subscription_plan 
    INTO current_end_date, v_old_plan
    FROM profiles 
    WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not found'
        );
    END IF;
    
    -- Calculate new end date
    IF current_end_date IS NULL OR current_end_date < NOW() THEN
        new_end_date := NOW() + (p_days || ' days')::INTERVAL;
    ELSE
        new_end_date := current_end_date + (p_days || ' days')::INTERVAL;
    END IF;
    
    -- Update profile
    UPDATE profiles 
    SET 
        subscription_end_date = new_end_date,
        subscription_status = 'active',
        subscription_plan = COALESCE(p_plan, subscription_plan, 'pro'),
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Log in subscription history (if table exists)
    BEGIN
        INSERT INTO subscription_history (
            user_id, changed_by_agent_id, action, previous_plan, new_plan, 
            days_added, reason, old_end_date, new_end_date
        ) VALUES (
            p_user_id, p_agent_id, 'extended', v_old_plan, COALESCE(p_plan, 'pro'),
            p_days, p_reason, current_end_date, new_end_date
        );
    EXCEPTION WHEN OTHERS THEN
        -- Handle missing table or other issues gracefully
        NULL;
    END;
    
    -- Log agent activity
    BEGIN
        INSERT INTO agent_activity_logs (
            agent_id, action_type, user_id, details
        ) VALUES (
            p_agent_id, 'subscription_extended', p_user_id,
            jsonb_build_object(
                'days_added', p_days,
                'plan', p_plan,
                'reason', p_reason
            )
        );
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', format('Subscription extended to %s', new_end_date),
        'new_end_date', new_end_date
    );
END;
$$;

-- 2. CANCEL SUBSCRIPTION
CREATE OR REPLACE FUNCTION public.cancel_subscription(
    p_user_id UUID,
    p_agent_id UUID,
    p_reason TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_old_end_date TIMESTAMPTZ;
    v_old_plan TEXT;
BEGIN
    SELECT subscription_end_date, subscription_plan 
    INTO v_old_end_date, v_old_plan
    FROM profiles 
    WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not found'
        );
    END IF;
    
    -- Update profile
    UPDATE profiles 
    SET 
        subscription_status = 'free',
        subscription_plan = NULL,
        subscription_end_date = NULL,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Log in history
    BEGIN
        INSERT INTO subscription_history (
            user_id, changed_by_agent_id, action, previous_plan, new_plan, 
            reason, old_end_date
        ) VALUES (
            p_user_id, p_agent_id, 'cancelled', v_old_plan, 'free',
            p_reason, v_old_end_date
        );
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    -- Log agent activity
    BEGIN
        INSERT INTO agent_activity_logs (
            agent_id, action_type, user_id, details
        ) VALUES (
            p_agent_id, 'subscription_cancelled', p_user_id,
            jsonb_build_object('reason', p_reason)
        );
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Subscription cancelled'
    );
END;
$$;
