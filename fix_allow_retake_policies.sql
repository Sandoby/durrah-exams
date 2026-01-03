-- Fix allow-retake flow: permit tutors to delete submissions/answers for their exams

-- Ensure RLS is on (should already be enabled)
alter table public.submissions enable row level security;
alter table public.submission_answers enable row level security;

-- Tutors can delete submissions for their own exams
DROP POLICY IF EXISTS "Tutors can delete submissions for own exams" ON public.submissions;
CREATE POLICY "Tutors can delete submissions for own exams" ON public.submissions
AS PERMISSIVE FOR DELETE
TO authenticated
USING (
  exists (
    select 1 from public.exams e
    where e.id = submissions.exam_id and e.tutor_id = auth.uid()
  )
);

-- Tutors can delete submission answers for their own exams
DROP POLICY IF EXISTS "Tutors can delete submission answers for own exams" ON public.submission_answers;
CREATE POLICY "Tutors can delete submission answers for own exams" ON public.submission_answers
AS PERMISSIVE FOR DELETE
TO authenticated
USING (
  exists (
    select 1
    from public.submissions s
    join public.exams e on e.id = s.exam_id
    where s.id = submission_answers.submission_id
      and e.tutor_id = auth.uid()
  )
);

-- Ensure authenticated tutors have delete grants (RLS still enforced)
GRANT DELETE ON public.submissions TO authenticated;
GRANT DELETE ON public.submission_answers TO authenticated;
