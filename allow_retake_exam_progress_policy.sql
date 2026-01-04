-- Allow Retake: Add DELETE policy for exam_progress
-- This allows tutors to delete student progress when allowing retakes

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
