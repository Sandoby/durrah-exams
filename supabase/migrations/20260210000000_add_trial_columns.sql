-- ============================================================================
-- Migration: Add 14-Day Free Trial Support
-- Description: Adds trial columns to profiles and RPC functions for trial
--              eligibility checking and activation.
-- ============================================================================

-- 1. Add trial columns to profiles
ALTER TABLE IF EXISTS public.profiles
ADD COLUMN IF NOT EXISTS trial_started_at timestamptz,
ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
ADD COLUMN IF NOT EXISTS trial_grace_ends_at timestamptz,
ADD COLUMN IF NOT EXISTS trial_activated boolean DEFAULT false;

-- 2. Add indexes for cron job performance
CREATE INDEX IF NOT EXISTS idx_profiles_trial_ends_at
ON public.profiles (trial_ends_at)
WHERE trial_ends_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_trial_grace_ends_at
ON public.profiles (trial_grace_ends_at)
WHERE trial_grace_ends_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_trial_activated
ON public.profiles (trial_activated)
WHERE trial_activated = false;

-- 3. RPC: Check trial eligibility
-- Returns true if user has never had a subscription and trial_activated is false
CREATE OR REPLACE FUNCTION public.check_trial_eligibility(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile RECORD;
BEGIN
  SELECT subscription_status, trial_activated
  INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Not eligible if trial was already activated
  IF v_profile.trial_activated = true THEN
    RETURN false;
  END IF;

  -- Not eligible if user already has or had a paid subscription
  IF v_profile.subscription_status IN ('active', 'cancelled', 'payment_failed', 'expired') THEN
    RETURN false;
  END IF;

  -- Also check if user has any payment history (meaning they subscribed before)
  IF EXISTS (
    SELECT 1 FROM public.payments
    WHERE user_id = p_user_id
    LIMIT 1
  ) THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

-- 4. RPC: Activate trial for a user
-- Sets subscription_status to 'trialing', calculates trial dates, sets trial_activated flag
CREATE OR REPLACE FUNCTION public.activate_trial(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_eligible boolean;
  v_now timestamptz := now();
  v_trial_ends timestamptz := v_now + interval '14 days';
  v_grace_ends timestamptz := v_now + interval '17 days';
BEGIN
  -- Check eligibility first
  v_eligible := public.check_trial_eligibility(p_user_id);

  IF NOT v_eligible THEN
    RETURN json_build_object('success', false, 'error', 'User is not eligible for trial');
  END IF;

  -- Activate the trial
  UPDATE public.profiles
  SET
    subscription_status = 'trialing',
    subscription_plan = 'Professional',
    trial_started_at = v_now,
    trial_ends_at = v_trial_ends,
    trial_grace_ends_at = v_grace_ends,
    trial_activated = true
  WHERE id = p_user_id;

  RETURN json_build_object(
    'success', true,
    'trial_started_at', v_now,
    'trial_ends_at', v_trial_ends,
    'trial_grace_ends_at', v_grace_ends
  );
END;
$$;

-- 5. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.check_trial_eligibility(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_trial_eligibility(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.activate_trial(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.activate_trial(uuid) TO service_role;
