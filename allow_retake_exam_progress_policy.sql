-- Allow Retake: Add DELETE policy for exam_progress
-- This allows tutors to delete student progress when allowing retakes

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Tutors can delete progress for retakes" ON exam_progress;
DROP POLICY IF EXISTS "Tutors can update progress for their exams" ON exam_progress;

-- Tutors can delete progress for their exams (for allowing retakes)
CREATE POLICY "Tutors can delete progress for retakes"
    ON exam_progress FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM exams
            WHERE exams.id = exam_progress.exam_id
            AND exams.tutor_id = auth.uid()
        )
    );

-- Also allow tutors to update progress for their exams (optional, for resetting status)
CREATE POLICY "Tutors can update progress for their exams"
    ON exam_progress FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM exams
            WHERE exams.id = exam_progress.exam_id
            AND exams.tutor_id = auth.uid()
        )
    );
