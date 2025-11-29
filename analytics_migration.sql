-- Analytics Database Migration
-- This creates tables to track question performance and student analytics

-- 1. Question Analytics Table
-- Tracks performance metrics for each question in each exam
CREATE TABLE IF NOT EXISTS public.question_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
    question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
    total_attempts INTEGER DEFAULT 0,
    correct_attempts INTEGER DEFAULT 0,
    average_time_seconds DECIMAL(10, 2) DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(exam_id, question_id)
);

-- 2. Enable RLS
ALTER TABLE public.question_analytics ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies - Only tutors can view analytics
CREATE POLICY "Tutors can view question analytics" ON public.question_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.exams
            WHERE exams.id = question_analytics.exam_id
            AND exams.tutor_id = auth.uid()
        )
    );

-- 4. Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_question_analytics_exam ON public.question_analytics(exam_id);
CREATE INDEX IF NOT EXISTS idx_question_analytics_question ON public.question_analytics(question_id);

-- 5. Function to update question analytics
-- This will be called after each submission to update stats
CREATE OR REPLACE FUNCTION update_question_analytics(
    p_exam_id UUID,
    p_question_id UUID,
    p_is_correct BOOLEAN,
    p_time_seconds DECIMAL DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.question_analytics (
        exam_id,
        question_id,
        total_attempts,
        correct_attempts,
        average_time_seconds
    )
    VALUES (
        p_exam_id,
        p_question_id,
        1,
        CASE WHEN p_is_correct THEN 1 ELSE 0 END,
        COALESCE(p_time_seconds, 0)
    )
    ON CONFLICT (exam_id, question_id)
    DO UPDATE SET
        total_attempts = question_analytics.total_attempts + 1,
        correct_attempts = question_analytics.correct_attempts + CASE WHEN p_is_correct THEN 1 ELSE 0 END,
        average_time_seconds = CASE 
            WHEN p_time_seconds IS NOT NULL THEN
                ((question_analytics.average_time_seconds * question_analytics.total_attempts) + p_time_seconds) / (question_analytics.total_attempts + 1)
            ELSE
                question_analytics.average_time_seconds
        END,
        last_updated = timezone('utc'::text, now());
END;
$$;

-- 6. Add analytics columns to submissions table (if not exists)
-- This helps with faster queries without joining multiple tables
DO $$ 
BEGIN
    -- Add time_taken column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'submissions' AND column_name = 'time_taken_seconds'
    ) THEN
        ALTER TABLE public.submissions ADD COLUMN time_taken_seconds INTEGER;
    END IF;

    -- Add violations_count column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'submissions' AND column_name = 'violations_count'
    ) THEN
        ALTER TABLE public.submissions ADD COLUMN violations_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- 7. Create view for easy analytics queries
CREATE OR REPLACE VIEW public.exam_analytics_summary AS
SELECT 
    e.id as exam_id,
    e.title as exam_title,
    e.tutor_id,
    COUNT(DISTINCT s.id) as total_submissions,
    AVG(s.score) as average_score,
    MAX(s.score) as highest_score,
    MIN(s.score) as lowest_score,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY s.score) as median_score,
    COUNT(CASE WHEN s.score >= (e.settings->>'passing_score')::numeric THEN 1 END) as passed_count,
    COUNT(CASE WHEN s.score < (e.settings->>'passing_score')::numeric THEN 1 END) as failed_count
FROM public.exams e
LEFT JOIN public.submissions s ON e.id = s.exam_id
GROUP BY e.id, e.title, e.tutor_id;

-- 8. Grant permissions
GRANT SELECT ON public.exam_analytics_summary TO authenticated;
GRANT EXECUTE ON FUNCTION update_question_analytics TO authenticated;
