-- Update the analytics summary view to include average time taken
CREATE OR REPLACE VIEW public.exam_analytics_summary AS
SELECT 
    e.id as exam_id,
    e.title as exam_title,
    e.tutor_id,
    COUNT(DISTINCT s.id) as total_submissions,
    AVG(s.score) as average_score,
    AVG(s.time_taken) as average_time_taken,
    MAX(s.score) as highest_score,
    MIN(s.score) as lowest_score,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY s.score) as median_score,
    COUNT(CASE WHEN s.score >= (e.settings->>'passing_score')::numeric THEN 1 END) as passed_count,
    COUNT(CASE WHEN s.score < (e.settings->>'passing_score')::numeric THEN 1 END) as failed_count
FROM public.exams e
LEFT JOIN public.submissions s ON e.id = s.exam_id
GROUP BY e.id, e.title, e.tutor_id;

-- Ensure tutors can access the view
GRANT SELECT ON public.exam_analytics_summary TO authenticated;
