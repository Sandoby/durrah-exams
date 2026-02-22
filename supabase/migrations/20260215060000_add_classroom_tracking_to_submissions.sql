-- ============================================================
-- MIGRATION: Add classroom tracking to exam submissions
-- Date: 2026-02-15
-- ============================================================

-- Purpose: Track which classroom context a student took an exam in
-- This allows tutors to see classroom-specific exam results

-- Add classroom_id column to submissions table
ALTER TABLE public.submissions 
  ADD COLUMN IF NOT EXISTS classroom_id UUID REFERENCES public.classrooms(id) ON DELETE SET NULL;

-- Index for fast classroom-based queries
CREATE INDEX IF NOT EXISTS idx_submissions_classroom_id ON public.submissions(classroom_id);

-- Create a view for classroom exam results
CREATE OR REPLACE VIEW public.classroom_exam_results AS
SELECT 
  s.id as submission_id,
  s.exam_id,
  s.classroom_id,
  s.student_name,
  s.student_email,
  s.score,
  s.max_score,
  s.percentage,
  s.time_taken,
  s.created_at as submitted_at,
  COALESCE(jsonb_array_length(s.violations), 0) as violations_count,
  e.title as exam_title,
  e.description as exam_description,
  c.name as classroom_name
FROM public.submissions s
INNER JOIN public.exams e ON e.id = s.exam_id
LEFT JOIN public.classrooms c ON c.id = s.classroom_id
WHERE s.classroom_id IS NOT NULL;

-- Grant access to authenticated users to view classroom exam results
GRANT SELECT ON public.classroom_exam_results TO authenticated;

COMMENT ON VIEW public.classroom_exam_results IS 'View showing exam submissions within classroom context with student and exam details';
