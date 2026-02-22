-- ============================================================
-- MIGRATION: Allow students to read exams linked to their classrooms
-- Date: 2026-02-15
-- ============================================================

-- Purpose: Students need to be able to read exam details when they're 
-- viewing exams assigned to their enrolled classrooms

-- Drop existing policy if exists
DROP POLICY IF EXISTS "Students can view classroom exams" ON public.exams;

-- Allow students to read exams that are linked to their enrolled classrooms
CREATE POLICY "Students can view classroom exams"
  ON public.exams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.classroom_exams ce
      INNER JOIN public.classroom_students cs ON cs.classroom_id = ce.classroom_id
      WHERE ce.exam_id = exams.id
      AND cs.student_id = auth.uid()
      AND cs.status = 'active'
    )
  );
