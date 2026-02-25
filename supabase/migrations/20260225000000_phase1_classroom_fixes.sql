-- ============================================================
-- MIGRATION: Phase 1 - Critical Classroom Fixes
-- Date: 2026-02-25
-- Tasks: 1.1, 1.2, 1.3, 1.5, 1.6
-- ============================================================


-- ============================================================
-- TASK 1.2: Add due_date + assigned_at to classroom_exams
-- ============================================================

ALTER TABLE public.classroom_exams
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS instructions TEXT DEFAULT '';

-- Back-fill assigned_at from added_at for existing rows
UPDATE public.classroom_exams
  SET assigned_at = added_at
  WHERE assigned_at IS NULL;

-- Index for due date queries (find upcoming/overdue exams)
CREATE INDEX IF NOT EXISTS idx_classroom_exams_due_date ON public.classroom_exams(due_date)
  WHERE due_date IS NOT NULL;


-- ============================================================
-- TASK 1.3: Fix get_classroom_stats to return correct keys
-- active_students and total_exams were missing
-- ============================================================

CREATE OR REPLACE FUNCTION get_classroom_stats(p_classroom_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  -- Verify the caller owns this classroom
  IF NOT EXISTS (
    SELECT 1 FROM public.classrooms
    WHERE id = p_classroom_id AND tutor_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT jsonb_build_object(
    'total_students',   (SELECT COUNT(*) FROM classroom_students
                         WHERE classroom_id = p_classroom_id
                         AND status IN ('active', 'pending', 'suspended')),
    'active_students',  (SELECT COUNT(*) FROM classroom_students
                         WHERE classroom_id = p_classroom_id AND status = 'active'),
    'pending_students', (SELECT COUNT(*) FROM classroom_students
                         WHERE classroom_id = p_classroom_id AND status = 'pending'),
    'total_exams',      (SELECT COUNT(*) FROM classroom_exams
                         WHERE classroom_id = p_classroom_id),
    'linked_exams',     (SELECT COUNT(*) FROM classroom_exams
                         WHERE classroom_id = p_classroom_id),
    'total_submissions',(
      SELECT COUNT(*) FROM submissions s
      INNER JOIN classroom_exams ce ON ce.exam_id = s.exam_id
      WHERE ce.classroom_id = p_classroom_id
    ),
    'avg_score_percent',(
      SELECT COALESCE(ROUND(AVG(
        CASE WHEN s.max_score > 0
             THEN (s.score::float / s.max_score * 100)
             ELSE 0 END
      )), 0)
      FROM submissions s
      INNER JOIN classroom_exams ce ON ce.exam_id = s.exam_id
      WHERE ce.classroom_id = p_classroom_id
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_classroom_stats(UUID) TO authenticated;


-- ============================================================
-- TASK 1.5: Secure classroom_exam_results view
-- Replace open GRANT with a SECURITY DEFINER function that
-- enforces tutor ownership or active student enrollment
-- ============================================================

-- Revoke the blanket grant from the view
REVOKE SELECT ON public.classroom_exam_results FROM authenticated;

-- Drop old view and replace with security-definer function
DROP VIEW IF EXISTS public.classroom_exam_results;

-- Secure function: tutors see all results for their classrooms;
-- students see only their own results in classrooms they're enrolled in
CREATE OR REPLACE FUNCTION get_classroom_exam_results(p_classroom_id UUID)
RETURNS TABLE (
  submission_id   UUID,
  exam_id         UUID,
  classroom_id    UUID,
  student_name    TEXT,
  student_email   TEXT,
  score           NUMERIC,
  max_score       NUMERIC,
  percentage      NUMERIC,
  time_taken      INTEGER,
  submitted_at    TIMESTAMPTZ,
  violations_count BIGINT,
  exam_title      TEXT,
  exam_description TEXT,
  classroom_name  TEXT
) AS $$
BEGIN
  -- Must be the classroom tutor OR an active enrolled student
  IF NOT EXISTS (
    SELECT 1 FROM public.classrooms
    WHERE id = p_classroom_id AND tutor_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM public.classroom_students
    WHERE classroom_id = p_classroom_id
    AND student_id = auth.uid()
    AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    s.id,
    s.exam_id,
    s.classroom_id,
    s.student_name,
    -- Hide other students' emails from students
    CASE
      WHEN EXISTS (
        SELECT 1 FROM public.classrooms c2
        WHERE c2.id = p_classroom_id AND c2.tutor_id = auth.uid()
      ) THEN s.student_email
      ELSE NULL
    END,
    s.score,
    s.max_score,
    s.percentage,
    s.time_taken,
    s.created_at,
    COALESCE(jsonb_array_length(s.violations), 0)::BIGINT,
    e.title,
    e.description,
    c.name
  FROM public.submissions s
  INNER JOIN public.exams e ON e.id = s.exam_id
  LEFT JOIN public.classrooms c ON c.id = s.classroom_id
  WHERE s.classroom_id = p_classroom_id
    -- Students only see their own results
    AND (
      EXISTS (
        SELECT 1 FROM public.classrooms c3
        WHERE c3.id = p_classroom_id AND c3.tutor_id = auth.uid()
      )
      OR s.student_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_classroom_exam_results(UUID) TO authenticated;


-- ============================================================
-- TASK 1.6: Rate limiting table + updated lookup_classroom_by_code
-- Max 10 invite code lookups per user per minute
-- ============================================================

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('minute', now()),
  hit_count   INTEGER NOT NULL DEFAULT 1,
  UNIQUE (user_id, action, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action ON public.rate_limits(user_id, action, window_start);

-- Only users can read/write their own rate limit rows
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own rate limit rows"
  ON public.rate_limits FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Updated lookup function with rate limiting
CREATE OR REPLACE FUNCTION lookup_classroom_by_code(p_code TEXT)
RETURNS TABLE (
  id            UUID,
  name          TEXT,
  subject       TEXT,
  grade_level   TEXT,
  academic_year TEXT,
  description   TEXT,
  color         TEXT,
  student_count INTEGER,
  invite_code   TEXT,
  is_archived   BOOLEAN,
  settings      JSONB,
  tutor_name    TEXT
) AS $$
DECLARE
  v_window TIMESTAMPTZ := date_trunc('minute', now());
  v_hits   INTEGER;
BEGIN
  -- Rate limit: max 10 lookups per minute per user
  INSERT INTO public.rate_limits (user_id, action, window_start, hit_count)
    VALUES (auth.uid(), 'lookup_classroom', v_window, 1)
    ON CONFLICT (user_id, action, window_start)
    DO UPDATE SET hit_count = rate_limits.hit_count + 1
    RETURNING hit_count INTO v_hits;

  IF v_hits > 10 THEN
    RAISE EXCEPTION 'Too many requests. Please wait a moment before trying again.';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.subject,
    c.grade_level,
    c.academic_year,
    c.description,
    c.color,
    c.student_count,
    c.invite_code,
    c.is_archived,
    c.settings,
    p.full_name AS tutor_name
  FROM public.classrooms c
  LEFT JOIN public.profiles p ON c.tutor_id = p.id
  WHERE c.invite_code = upper(trim(p_code));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION lookup_classroom_by_code(TEXT) TO authenticated;


-- ============================================================
-- TASK 1.1: Atomic join_classroom RPC
-- Replaces the client-side join flow in useInviteCode.ts
-- Fixes: BUG-01 (RLS bypass), BUG-02 (race condition), SEC-02
-- ============================================================

CREATE OR REPLACE FUNCTION join_classroom(p_invite_code TEXT)
RETURNS JSONB AS $$
DECLARE
  v_classroom       public.classrooms%ROWTYPE;
  v_existing_status TEXT;
  v_auto_approve    BOOLEAN;
  v_enrollment_status TEXT;
  v_max_capacity    INTEGER;
  v_active_count    INTEGER;
  v_window          TIMESTAMPTZ := date_trunc('minute', now());
  v_hits            INTEGER;
BEGIN
  -- Rate limit: max 5 join attempts per minute
  INSERT INTO public.rate_limits (user_id, action, window_start, hit_count)
    VALUES (auth.uid(), 'join_classroom', v_window, 1)
    ON CONFLICT (user_id, action, window_start)
    DO UPDATE SET hit_count = rate_limits.hit_count + 1
    RETURNING hit_count INTO v_hits;

  IF v_hits > 5 THEN
    RAISE EXCEPTION 'Too many join attempts. Please wait a moment.';
  END IF;

  -- Look up classroom (SECURITY DEFINER bypasses RLS)
  SELECT * INTO v_classroom
  FROM public.classrooms
  WHERE invite_code = upper(trim(p_invite_code));

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_code',
                              'message', 'Invalid invite code');
  END IF;

  -- Check archived
  IF v_classroom.is_archived THEN
    RETURN jsonb_build_object('success', false, 'error', 'archived',
                              'message', 'This classroom is no longer accepting students');
  END IF;

  -- Check existing enrollment
  SELECT status INTO v_existing_status
  FROM public.classroom_students
  WHERE classroom_id = v_classroom.id AND student_id = auth.uid();

  IF FOUND THEN
    IF v_existing_status = 'active' THEN
      RETURN jsonb_build_object('success', false, 'error', 'already_enrolled',
                                'message', 'You are already in this classroom');
    ELSIF v_existing_status = 'pending' THEN
      RETURN jsonb_build_object('success', false, 'error', 'pending',
                                'message', 'Your enrollment is pending approval');
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'removed',
                                'message', 'You were previously removed from this classroom');
    END IF;
  END IF;

  -- Atomic capacity check
  v_max_capacity := COALESCE((v_classroom.settings->>'max_capacity')::INTEGER, 100);

  SELECT COUNT(*) INTO v_active_count
  FROM public.classroom_students
  WHERE classroom_id = v_classroom.id AND status = 'active'
  FOR UPDATE; -- Lock to prevent race condition

  IF v_active_count >= v_max_capacity THEN
    RETURN jsonb_build_object('success', false, 'error', 'full',
                              'message', 'This classroom is full');
  END IF;

  -- Determine enrollment status
  v_auto_approve := COALESCE((v_classroom.settings->>'auto_approve_students')::BOOLEAN, true);
  v_enrollment_status := CASE WHEN v_auto_approve THEN 'active' ELSE 'pending' END;

  -- Insert enrollment
  INSERT INTO public.classroom_students (
    classroom_id, student_id, status, enrollment_method
  ) VALUES (
    v_classroom.id, auth.uid(), v_enrollment_status, 'invite_code'
  );

  -- Notify tutor
  INSERT INTO public.notifications (
    user_id, type, title, message, read, metadata
  ) VALUES (
    v_classroom.tutor_id,
    'student_joined',
    'New Student Joined',
    CASE WHEN v_auto_approve
         THEN 'A student has joined ' || v_classroom.name
         ELSE 'A student has requested to join ' || v_classroom.name
    END,
    false,
    jsonb_build_object(
      'classroom_id', v_classroom.id,
      'student_id', auth.uid()
    )
  );

  RETURN jsonb_build_object(
    'success',  true,
    'status',   v_enrollment_status,
    'classroom', jsonb_build_object(
      'id',      v_classroom.id,
      'name',    v_classroom.name,
      'subject', v_classroom.subject
    )
  );

EXCEPTION
  WHEN unique_violation THEN
    -- Race condition: another request inserted first
    RETURN jsonb_build_object('success', false, 'error', 'already_enrolled',
                              'message', 'You are already in this classroom');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION join_classroom(TEXT) TO authenticated;
