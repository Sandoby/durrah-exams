-- =============================================================================
-- FIX: Classroom Privacy - Tutors seeing all classrooms
-- INSTRUCTIONS: Copy this ENTIRE script into Supabase SQL Editor and run it
-- =============================================================================

-- STEP 1: Drop all overly-permissive SELECT policies on classrooms
DROP POLICY IF EXISTS "Authenticated users can view classrooms" ON public.classrooms;
DROP POLICY IF EXISTS "Anyone can lookup classroom by invite code" ON public.classrooms;
DROP POLICY IF EXISTS "Tutors can view own classrooms" ON public.classrooms;
DROP POLICY IF EXISTS "Students can view enrolled classrooms" ON public.classrooms;
DROP POLICY IF EXISTS "Allow selection by ID for joining" ON public.classrooms;

-- STEP 2: Re-create strict and correct SELECT policies

-- Tutors can ONLY see their own classrooms
CREATE POLICY "Tutors can view own classrooms"
  ON public.classrooms FOR SELECT
  USING (auth.uid() = tutor_id);

-- Students can ONLY see classrooms they are actively enrolled in
CREATE POLICY "Students can view enrolled classrooms"
  ON public.classrooms FOR SELECT
  USING (is_student_in_classroom(id, auth.uid()));

-- STEP 3: Create a SECURITY DEFINER lookup function so students can 
-- still find a classroom by invite code without being able to list ALL classrooms
CREATE OR REPLACE FUNCTION lookup_classroom_by_code(p_code TEXT)
RETURNS TABLE (
    id UUID,
    name TEXT,
    subject TEXT,
    grade_level TEXT,
    academic_year TEXT,
    description TEXT,
    color TEXT,
    student_count INTEGER,
    invite_code TEXT,
    is_archived BOOLEAN,
    settings JSONB,
    tutor_name TEXT
) AS $$
BEGIN
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
        p.full_name as tutor_name
    FROM public.classrooms c
    LEFT JOIN public.profiles p ON c.tutor_id = p.id
    WHERE c.invite_code = p_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION lookup_classroom_by_code(TEXT) TO authenticated;

-- STEP 4: Verify — you should see ONLY 2 SELECT policies on classrooms
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'classrooms' AND cmd = 'SELECT'
ORDER BY policyname;

-- Expected output: exactly 2 rows:
-- "Students can view enrolled classrooms"
-- "Tutors can view own classrooms"
