-- =============================================================
-- SUBSCRIPTION SYSTEM REBUILD MIGRATION
-- Date: 2026-02-22
-- Purpose: Drop fragile trigger + old RPCs, install clean
--          state-machine-driven transition function.
-- Run this in: Supabase Dashboard → SQL Editor (run as superuser)
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. DROP DANGEROUS TRIGGER (root cause of deactivation bugs)
-- ─────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trigger_auto_expire_subscriptions ON profiles;
DROP FUNCTION IF EXISTS auto_expire_subscriptions();

-- ─────────────────────────────────────────────────────────────
-- 2. ADD dodo_subscription_id COLUMN (new clean mapping)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS dodo_subscription_id text;

CREATE INDEX IF NOT EXISTS idx_profiles_dodo_sub
  ON profiles (dodo_subscription_id)
  WHERE dodo_subscription_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- 3. DROP OLD SUBSCRIPTION AUDIT LOG (inconsistent schema)
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS subscription_audit_log CASCADE;

-- ─────────────────────────────────────────────────────────────
-- 4. CREATE CLEAN SUBSCRIPTION AUDIT LOG
-- ─────────────────────────────────────────────────────────────
CREATE TABLE subscription_audit_log (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action              text NOT NULL,
  old_status          text,
  new_status          text,
  old_end_date        timestamptz,
  new_end_date        timestamptz,
  plan                text,
  billing_cycle       text,
  source              text NOT NULL DEFAULT 'webhook',
  dodo_subscription_id text,
  dodo_customer_id    text,
  metadata            jsonb DEFAULT '{}',
  created_at          timestamptz DEFAULT now()
);

CREATE INDEX idx_audit_user    ON subscription_audit_log (user_id, created_at DESC);
CREATE INDEX idx_audit_action  ON subscription_audit_log (action, created_at DESC);
CREATE INDEX idx_audit_source  ON subscription_audit_log (source, created_at DESC);

-- Row-level security: only service role can write; admins can read
ALTER TABLE subscription_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to audit log"
  ON subscription_audit_log
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Admins can read audit log"
  ON subscription_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 5. STATE MACHINE VALIDATION FUNCTION
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_valid_subscription_transition(
  p_from text,
  p_to   text
)
RETURNS boolean
LANGUAGE plpgsql IMMUTABLE
AS $$
BEGIN
  RETURN CASE
    -- From no subscription (new user)
    WHEN COALESCE(p_from, 'none') IN ('none', '')
         AND p_to IN ('active', 'trialing')                       THEN true
    -- From trialing
    WHEN p_from = 'trialing'
         AND p_to IN ('active', 'expired', 'cancelled')           THEN true
    -- From active (paid subscription)
    WHEN p_from = 'active'
         AND p_to IN ('active', 'cancelled', 'expired', 'payment_failed') THEN true
    -- From payment_failed (retry window)
    WHEN p_from = 'payment_failed'
         AND p_to IN ('active', 'cancelled', 'expired')           THEN true
    -- From cancelled (resubscription)
    WHEN p_from = 'cancelled'
         AND p_to IN ('active', 'trialing', 'expired')            THEN true
    -- From expired (renewal or new subscription)
    WHEN p_from = 'expired'
         AND p_to IN ('active', 'trialing')                       THEN true
    ELSE false
  END;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 6. MASTER TRANSITION FUNCTION (replaces extend_subscription
--    + cancel_subscription, handles ALL status changes atomically)
-- ─────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS transition_subscription(uuid,text,timestamptz,text,text,text,text,text,jsonb);
CREATE OR REPLACE FUNCTION transition_subscription(
  p_user_id             uuid,
  p_new_status          text,
  p_end_date            timestamptz  DEFAULT NULL,
  p_plan                text         DEFAULT 'Professional',
  p_billing_cycle       text         DEFAULT NULL,
  p_dodo_customer_id    text         DEFAULT NULL,
  p_dodo_subscription_id text        DEFAULT NULL,
  p_source              text         DEFAULT 'webhook',
  p_metadata            jsonb        DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_status          text;
  v_old_end_date        timestamptz;
  v_new_end_date        timestamptz;
BEGIN
  -- ── Row-level lock prevents concurrent webhook races ──────
  SELECT subscription_status, subscription_end_date
  INTO   v_old_status, v_old_end_date
  FROM   profiles
  WHERE  id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- ── Reject invalid transitions ────────────────────────────
  IF NOT is_valid_subscription_transition(v_old_status, p_new_status) THEN
    INSERT INTO subscription_audit_log
      (user_id, action, old_status, new_status, source, metadata)
    VALUES
      (p_user_id, 'rejected_transition', v_old_status, p_new_status, p_source,
       p_metadata || jsonb_build_object('reason', 'invalid_transition'));

    RETURN jsonb_build_object(
      'success',    false,
      'error',      format('Invalid transition: %s → %s',
                           COALESCE(v_old_status, 'none'), p_new_status),
      'old_status', v_old_status,
      'new_status', p_new_status
    );
  END IF;

  -- ── Resolve final end date ────────────────────────────────
  -- For active: use provided date or keep existing (never shrink an active end date)
  IF p_new_status = 'active' THEN
    IF p_end_date IS NOT NULL THEN
      -- Use the greater of: provided date vs current end date (prevents accidental shrinkage)
      v_new_end_date := GREATEST(p_end_date, COALESCE(v_old_end_date, now()));
    ELSE
      -- No date provided (shouldn't happen for webhooks, keep existing)
      v_new_end_date := v_old_end_date;
    END IF;
  ELSIF p_new_status IN ('cancelled', 'expired') THEN
    -- Keep existing end date so users know when access truly ends
    v_new_end_date := COALESCE(p_end_date, v_old_end_date);
  ELSIF p_new_status = 'payment_failed' THEN
    -- Keep current end date — user retains access until it naturally expires
    v_new_end_date := v_old_end_date;
  ELSE
    v_new_end_date := p_end_date;
  END IF;

  -- ── Apply the transition atomically ──────────────────────
  UPDATE profiles SET
    subscription_status    = p_new_status,
    subscription_end_date  = v_new_end_date,
    subscription_plan      = COALESCE(NULLIF(p_plan, ''), subscription_plan, 'Professional'),
    billing_cycle          = COALESCE(NULLIF(p_billing_cycle, ''), billing_cycle),
    dodo_customer_id       = COALESCE(NULLIF(p_dodo_customer_id, ''), dodo_customer_id),
    dodo_subscription_id   = COALESCE(NULLIF(p_dodo_subscription_id, ''), dodo_subscription_id),
    updated_at             = now()
  WHERE id = p_user_id;

  -- ── Full audit trail ──────────────────────────────────────
  INSERT INTO subscription_audit_log
    (user_id, action, old_status, new_status, old_end_date, new_end_date,
     plan, billing_cycle, source, dodo_subscription_id, dodo_customer_id, metadata)
  VALUES
    (p_user_id, p_new_status, v_old_status, p_new_status, v_old_end_date,
     v_new_end_date, COALESCE(NULLIF(p_plan, ''), 'Professional'),
     p_billing_cycle, p_source, p_dodo_subscription_id, p_dodo_customer_id,
     p_metadata);

  RETURN jsonb_build_object(
    'success',      true,
    'old_status',   v_old_status,
    'new_status',   p_new_status,
    'old_end_date', v_old_end_date,
    'new_end_date', v_new_end_date
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 7. NEW activate_trial FUNCTION (clean, eligibility-gated)
-- ─────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS activate_trial(uuid);
CREATE OR REPLACE FUNCTION activate_trial(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile   RECORD;
  v_trial_end timestamptz;
BEGIN
  SELECT * INTO v_profile
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Eligibility checks
  IF v_profile.trial_activated = true THEN
    RETURN jsonb_build_object('success', false, 'error', 'Trial already used');
  END IF;

  IF v_profile.subscription_status IN ('active', 'trialing') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already has active subscription');
  END IF;

  -- Previous paid subscriber cannot trial again
  IF EXISTS (
    SELECT 1 FROM payments
    WHERE user_id = p_user_id
      AND status = 'completed'
    LIMIT 1
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Previous subscriber — trial not available');
  END IF;

  v_trial_end := now() + interval '14 days';

  UPDATE profiles SET
    subscription_status    = 'trialing',
    subscription_plan      = 'Professional',
    subscription_end_date  = v_trial_end,
    trial_started_at       = now(),
    trial_ends_at          = v_trial_end,
    trial_activated        = true,
    updated_at             = now()
  WHERE id = p_user_id;

  INSERT INTO subscription_audit_log
    (user_id, action, old_status, new_status, new_end_date, plan, source)
  VALUES
    (p_user_id, 'trial_start', v_profile.subscription_status,
     'trialing', v_trial_end, 'Professional', 'trial_system');

  RETURN jsonb_build_object(
    'success',       true,
    'trial_ends_at', v_trial_end
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 8. check_trial_eligibility FUNCTION (read-only helper)
-- ─────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS check_trial_eligibility(uuid);
CREATE OR REPLACE FUNCTION check_trial_eligibility(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile RECORD;
BEGIN
  SELECT trial_activated, subscription_status
  INTO v_profile
  FROM profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'User not found');
  END IF;

  IF v_profile.trial_activated = true THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'Trial already used');
  END IF;

  IF v_profile.subscription_status IN ('active', 'trialing') THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'Already subscribed');
  END IF;

  IF EXISTS (
    SELECT 1 FROM payments
    WHERE user_id = p_user_id AND status = 'completed'
    LIMIT 1
  ) THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'Previous subscriber');
  END IF;

  RETURN jsonb_build_object('eligible', true);
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 9. DROP OLD RPC FUNCTIONS (replaced by transition_subscription)
-- ─────────────────────────────────────────────────────────────
-- (Only drop if they exist — safe for environments that already cleaned up)
DROP FUNCTION IF EXISTS extend_subscription(uuid, uuid, integer, text, text);
DROP FUNCTION IF EXISTS extend_subscription(uuid, integer, text, jsonb);
DROP FUNCTION IF EXISTS cancel_subscription(uuid, uuid, text);
DROP FUNCTION IF EXISTS cancel_subscription(uuid, text, jsonb);

-- ─────────────────────────────────────────────────────────────
-- 10. GRANT EXECUTE TO service_role
-- ─────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION transition_subscription(uuid,text,timestamptz,text,text,text,text,text,jsonb)
  TO service_role;

GRANT EXECUTE ON FUNCTION activate_trial(uuid)
  TO service_role;

GRANT EXECUTE ON FUNCTION check_trial_eligibility(uuid)
  TO service_role;

GRANT EXECUTE ON FUNCTION is_valid_subscription_transition(text, text)
  TO service_role, authenticated, anon;

-- ─────────────────────────────────────────────────────────────
-- DONE
-- Next step: Deploy updated Convex backend (dodoPayments.ts rewrite)
-- ─────────────────────────────────────────────────────────────
