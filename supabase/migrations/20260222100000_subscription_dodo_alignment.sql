-- =============================================================
-- DODO PAYMENTS ALIGNMENT MIGRATION
-- Date: 2026-02-22
-- Purpose: Align subscription state machine with official
--          Dodo Payments subscription lifecycle.
--
-- Changes:
--   1. Add 'on_hold' and 'pending' as valid subscription states
--   2. Update state machine transition rules
--   3. Rebuild transition_subscription to accept on_hold
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. UPDATE STATE MACHINE VALIDATION FUNCTION
--    Official Dodo states: active, on_hold, cancelled, expired, pending
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
    -- From no subscription / new user
    WHEN COALESCE(p_from, 'none') IN ('none', '')
         AND p_to IN ('active', 'trialing', 'pending')                         THEN true

    -- From pending (subscription being created)
    WHEN p_from = 'pending'
         AND p_to IN ('active', 'cancelled', 'on_hold')                        THEN true

    -- From trialing
    WHEN p_from = 'trialing'
         AND p_to IN ('active', 'expired', 'cancelled')                        THEN true

    -- From active (paid subscription)
    WHEN p_from = 'active'
         AND p_to IN ('active', 'cancelled', 'expired', 'on_hold',
                      'payment_failed')                                        THEN true

    -- From on_hold (failed renewal — Dodo's official state)
    WHEN p_from = 'on_hold'
         AND p_to IN ('active', 'cancelled', 'expired')                        THEN true

    -- From payment_failed (legacy — same as on_hold behavior)
    WHEN p_from = 'payment_failed'
         AND p_to IN ('active', 'cancelled', 'expired')                        THEN true

    -- From cancelled (resubscription)
    WHEN p_from = 'cancelled'
         AND p_to IN ('active', 'trialing', 'expired', 'pending')              THEN true

    -- From expired (renewal or new subscription)
    WHEN p_from = 'expired'
         AND p_to IN ('active', 'trialing', 'pending')                         THEN true

    ELSE false
  END;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 2. REBUILD TRANSITION FUNCTION
--    Handles on_hold as a proper state (retains access until
--    payment method is updated via Dodo Customer Portal).
-- ─────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS transition_subscription(uuid,text,timestamptz,text,text,text,text,text,jsonb);
CREATE OR REPLACE FUNCTION transition_subscription(
  p_user_id              uuid,
  p_new_status           text,
  p_end_date             timestamptz  DEFAULT NULL,
  p_plan                 text         DEFAULT 'Professional',
  p_billing_cycle        text         DEFAULT NULL,
  p_dodo_customer_id     text         DEFAULT NULL,
  p_dodo_subscription_id text         DEFAULT NULL,
  p_source               text         DEFAULT 'webhook',
  p_metadata             jsonb        DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_status   text;
  v_old_end_date timestamptz;
  v_new_end_date timestamptz;
BEGIN
  -- Row-level lock prevents concurrent webhook races
  SELECT subscription_status, subscription_end_date
  INTO   v_old_status, v_old_end_date
  FROM   profiles
  WHERE  id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Idempotent: same status + same end date → skip
  IF v_old_status = p_new_status
     AND (p_end_date IS NULL OR v_old_end_date = p_end_date)
     AND p_new_status NOT IN ('active')  -- always allow active→active (renewals)
  THEN
    RETURN jsonb_build_object(
      'success',    true,
      'old_status', v_old_status,
      'new_status', p_new_status,
      'skipped',    true,
      'reason',     'idempotent'
    );
  END IF;

  -- Reject invalid transitions
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

  -- Resolve final end date
  IF p_new_status = 'active' THEN
    IF p_end_date IS NOT NULL THEN
      v_new_end_date := GREATEST(p_end_date, COALESCE(v_old_end_date, now()));
    ELSE
      v_new_end_date := v_old_end_date;
    END IF;
  ELSIF p_new_status IN ('cancelled', 'expired') THEN
    v_new_end_date := COALESCE(p_end_date, v_old_end_date);
  ELSIF p_new_status IN ('on_hold', 'payment_failed') THEN
    -- On hold: keep current end date — user retains access until resolved
    v_new_end_date := v_old_end_date;
  ELSIF p_new_status = 'pending' THEN
    v_new_end_date := p_end_date;
  ELSE
    v_new_end_date := p_end_date;
  END IF;

  -- Apply the transition atomically
  UPDATE profiles SET
    subscription_status    = p_new_status,
    subscription_end_date  = v_new_end_date,
    subscription_plan      = COALESCE(NULLIF(p_plan, ''), subscription_plan, 'Professional'),
    billing_cycle          = COALESCE(NULLIF(p_billing_cycle, ''), billing_cycle),
    dodo_customer_id       = COALESCE(NULLIF(p_dodo_customer_id, ''), dodo_customer_id),
    dodo_subscription_id   = COALESCE(NULLIF(p_dodo_subscription_id, ''), dodo_subscription_id),
    updated_at             = now()
  WHERE id = p_user_id;

  -- Full audit trail
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
-- 3. RE-GRANT EXECUTE PERMISSIONS
-- ─────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION transition_subscription(uuid,text,timestamptz,text,text,text,text,text,jsonb)
  TO service_role;

GRANT EXECUTE ON FUNCTION is_valid_subscription_transition(text, text)
  TO service_role, authenticated, anon;

-- ─────────────────────────────────────────────────────────────
-- DONE
-- New states: on_hold, pending
-- Idempotent check prevents duplicate webhook side effects
-- ─────────────────────────────────────────────────────────────
