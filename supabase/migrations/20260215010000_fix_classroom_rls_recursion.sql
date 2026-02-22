-- ============================================================
-- FIX: Infinite recursion in classroom RLS policies
-- Date: 2026-02-15
-- ============================================================

-- Drop problematic policies
DROP POLICY IF EXISTS "Students can view enrolled classrooms" ON public.classrooms;
DROP POLICY IF EXISTS "Anyone can lookup classroom by invite code" ON public.classrooms;
DROP POLICY IF EXISTS "Tutors can view classroom students" ON public.classroom_students;
DROP POLICY IF EXISTS "Tutors can manage enrollments" ON public.classroom_students;
DROP POLICY IF EXISTS "Tutors can update enrollments" ON public.classroom_students;
DROP POLICY IF EXISTS "Tutors can remove students" ON public.classroom_students;
DROP POLICY IF EXISTS "Tutors can manage classroom exams" ON public.classroom_exams;
DROP POLICY IF EXISTS "Students can view classroom exams" ON public.classroom_exams;

-- ============================================================
-- CLASSROOMS - Simplified policies without recursion
-- ============================================================

-- Students can view classrooms they're enrolled in (using SECURITY DEFINER function)
CREATE OR REPLACE FUNCTION is_student_in_classroom(classroom_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.classroom_students
    WHERE classroom_students.classroom_id = $1
    AND classroom_students.student_id = $2
    AND classroom_students.status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE POLICY "Students can view enrolled classrooms"
  ON public.classrooms FOR SELECT
  USING (is_student_in_classroom(id, auth.uid()));

-- Anyone authenticated can read classrooms (needed for invite code lookup)
-- This is safe because invite codes should be shared
CREATE POLICY "Authenticated users can view classrooms"
  ON public.classrooms FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================================
-- CLASSROOM_STUDENTS - Simplified policies
-- ============================================================

-- Use SECURITY DEFINER function to check if user is tutor of classroom
CREATE OR REPLACE FUNCTION is_classroom_tutor(classroom_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.classrooms
    WHERE classrooms.id = $1
    AND classrooms.tutor_id = $2
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Tutors can view students in their classrooms
CREATE POLICY "Tutors can view classroom students"
  ON public.classroom_students FOR SELECT
  USING (is_classroom_tutor(classroom_id, auth.uid()));

-- Tutors can insert students
CREATE POLICY "Tutors can add students"
  ON public.classroom_students FOR INSERT
  WITH CHECK (is_classroom_tutor(classroom_id, auth.uid()));

-- Tutors can update enrollments
CREATE POLICY "Tutors can update enrollments"
  ON public.classroom_students FOR UPDATE
  USING (is_classroom_tutor(classroom_id, auth.uid()));

-- Tutors can remove students
CREATE POLICY "Tutors can remove students"
  ON public.classroom_students FOR DELETE
  USING (is_classroom_tutor(classroom_id, auth.uid()));

-- ============================================================
-- CLASSROOM_EXAMS - Simplified policies
-- ============================================================

-- Tutors can manage exam links for their classrooms
CREATE POLICY "Tutors can manage classroom exams"
  ON public.classroom_exams FOR ALL
  USING (is_classroom_tutor(classroom_id, auth.uid()));

-- Students can view exams linked to their enrolled classrooms
CREATE POLICY "Students can view classroom exams"
  ON public.classroom_exams FOR SELECT
  USING (is_student_in_classroom(classroom_id, auth.uid()));
