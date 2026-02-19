-- ============================================================
-- FIX: Classroom Privacy & Invite Code Lookup
-- Date: 2026-02-19
-- Purpose: Restrict classroom visibility so tutors only see their own classes
-- ============================================================

-- 1. Drop the overly permissive policies that allow listing all classrooms
DROP POLICY IF EXISTS "Authenticated users can view classrooms" ON public.classrooms;
DROP POLICY IF EXISTS "Anyone can lookup classroom by invite code" ON public.classrooms;

-- 2. Create a specific lookup function that bypasses RLS safely
-- This allows anyone to find a classroom if they know the code, but not list them
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION lookup_classroom_by_code(TEXT) TO authenticated;

-- 3. Ensure the core privacy policies are intact
-- (These should already be there from previous migrations, but we redeclare to be sure)

DROP POLICY IF EXISTS "Tutors can view own classrooms" ON public.classrooms;
CREATE POLICY "Tutors can view own classrooms"
  ON public.classrooms FOR SELECT
  USING (auth.uid() = tutor_id);

DROP POLICY IF EXISTS "Students can view enrolled classrooms" ON public.classrooms;
CREATE POLICY "Students can view enrolled classrooms"
  ON public.classrooms FOR SELECT
  USING (is_student_in_classroom(id, auth.uid()));

-- 4. Add a policy that allows selecting a SINGLE classroom if the user knows the ID and is joining
-- This is a fallback to allow the JoinClassroom page to work if it needs direct access
-- Note: It's safer to use the RPC above, but this policy helps with Supabase client relations
CREATE POLICY "Allow selection by ID for joining"
  ON public.classrooms FOR SELECT
  USING (
    -- This doesn't actually prevent listing but is better than 'true'
    -- In practice, we rely on the RPC for the lookup
    EXISTS (
        SELECT 1 FROM public.classroom_students cs 
        WHERE cs.classroom_id = classrooms.id AND cs.student_id = auth.uid()
    ) OR 
    auth.uid() = tutor_id
  );
