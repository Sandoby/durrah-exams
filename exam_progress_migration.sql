-- Exam Progress Table
-- Stores student exam progress linked to authenticated users
-- Replaces localStorage for exam state persistence

CREATE TABLE IF NOT EXISTS exam_progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    student_email TEXT NOT NULL,
    student_name TEXT,
    
    -- Exam state
    answers JSONB DEFAULT '{}'::jsonb,
    flagged_questions TEXT[] DEFAULT '{}',
    current_question_index INTEGER DEFAULT 0,
    
    -- Timer state
    time_remaining_seconds INTEGER,
    started_at TIMESTAMPTZ,
    
    -- Additional state
    violations JSONB DEFAULT '[]'::jsonb,
    scratchpad_content TEXT,
    confidence_levels JSONB DEFAULT '{}'::jsonb,
    
    -- Status
    status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'expired', 'auto_submitted')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint: one progress per user per exam
    UNIQUE(exam_id, user_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_exam_progress_user ON exam_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_progress_exam ON exam_progress(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_progress_status ON exam_progress(status);

-- RLS Policies
ALTER TABLE exam_progress ENABLE ROW LEVEL SECURITY;

-- Students can read/write their own progress
CREATE POLICY "Students can view own progress"
    ON exam_progress FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Students can insert own progress"
    ON exam_progress FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can update own progress"
    ON exam_progress FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Tutors/admins can view all progress for their exams
CREATE POLICY "Tutors can view progress for their exams"
    ON exam_progress FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM exams
            WHERE exams.id = exam_progress.exam_id
            AND exams.tutor_id = auth.uid()
        )
    );

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_exam_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS exam_progress_updated_at ON exam_progress;
CREATE TRIGGER exam_progress_updated_at
    BEFORE UPDATE ON exam_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_exam_progress_updated_at();

-- Grant permissions
GRANT ALL ON exam_progress TO authenticated;
GRANT SELECT ON exam_progress TO anon;
