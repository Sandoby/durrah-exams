-- IMMEDIATE FIX FOR EXAM SUBMISSION ERRORS
-- Run this in Supabase SQL Editor NOW

-- 1. Allow anonymous users to submit exams
DROP POLICY IF EXISTS "Allow anonymous submissions" ON public.submissions;

CREATE POLICY "Allow anonymous submissions" 
ON public.submissions
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- 2. Allow anonymous users to submit answers
DROP POLICY IF EXISTS "Allow anonymous answers" ON public.submission_answers;

CREATE POLICY "Allow anonymous answers" 
ON public.submission_answers
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- 3. Verify the policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename IN ('submissions', 'submission_answers')
ORDER BY tablename, policyname;

-- You should see two policies:
-- 1. "Allow anonymous submissions" on submissions table
-- 2. "Allow anonymous answers" on submission_answers table

-- After running this, refresh your exam page and try submitting again!
