-- Fix Analytics Page Permissions
-- Run this in Supabase SQL Editor to ensure analytics page works correctly

-- 1. Ensure tutors can view their own exam submissions
DROP POLICY IF EXISTS "Tutors can view submissions for own exams" ON public.submissions;
CREATE POLICY "Tutors can view submissions for own exams" ON public.submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.exams 
      WHERE exams.id = submissions.exam_id 
      AND exams.tutor_id = auth.uid()
    )
  );

-- 2. Ensure tutors can view submission answers for their exams
DROP POLICY IF EXISTS "Tutors can view answers for own exams" ON public.submission_answers;
CREATE POLICY "Tutors can view answers for own exams" ON public.submission_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.submissions s
      JOIN public.exams e ON s.exam_id = e.id
      WHERE s.id = submission_answers.submission_id 
      AND e.tutor_id = auth.uid()
    )
  );

-- 3. Ensure tutors can view questions for their exams
DROP POLICY IF EXISTS "Tutors can view questions for own exams" ON public.questions;
CREATE POLICY "Tutors can view questions for own exams" ON public.questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.exams 
      WHERE exams.id = questions.exam_id 
      AND exams.tutor_id = auth.uid()
    )
  );

-- 4. Add index for better performance on analytics queries
CREATE INDEX IF NOT EXISTS idx_submissions_exam_id ON public.submissions(exam_id);
CREATE INDEX IF NOT EXISTS idx_submission_answers_submission_id ON public.submission_answers(submission_id);
CREATE INDEX IF NOT EXISTS idx_submission_answers_question_id ON public.submission_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_questions_exam_id ON public.questions(exam_id);

-- 4.1 Add helpful columns for analytics (idempotent)
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS student_data jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS time_taken integer;

-- 5. Verify RLS is enabled on all tables
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

-- 6. Optional: Add a helper function to get exam analytics (more efficient)
CREATE OR REPLACE FUNCTION get_exam_analytics(exam_uuid UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_submissions', COUNT(s.id),
    'average_score', AVG(s.score),
    'average_percentage', AVG(s.percentage),
    'max_score', MAX(s.score),
    'min_score', MIN(s.score)
  ) INTO result
  FROM public.submissions s
  WHERE s.exam_id = exam_uuid;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_exam_analytics(UUID) TO authenticated;

-- Done! Your analytics page should now work correctly.
