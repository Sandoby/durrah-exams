-- ============================================================
-- Traffic Data Reliability Hardening
-- - Canonicalize top page paths
-- - Make realtime visitors session-driven (with heartbeat)
-- ============================================================

CREATE OR REPLACE FUNCTION get_top_pages(days_back int DEFAULT 30, page_limit int DEFAULT 20)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    SELECT json_agg(row_to_json(t)) INTO result
    FROM (
        WITH normalized_views AS (
            SELECT
                COALESCE(NULLIF(regexp_replace(split_part(path, '?', 1), '/+$', ''), ''), '/') AS normalized_path,
                session_id,
                duration_seconds,
                is_bounce
            FROM page_views
            WHERE created_at >= now() - (days_back || ' days')::interval
        )
        SELECT
            normalized_path AS path,
            COUNT(*) AS views,
            COUNT(DISTINCT session_id) AS unique_views,
            ROUND(AVG(duration_seconds) FILTER (WHERE duration_seconds > 0)) AS avg_duration,
            ROUND(
                (COUNT(*) FILTER (WHERE is_bounce = true))::numeric / NULLIF(COUNT(*), 0) * 100, 1
            ) AS bounce_rate
        FROM normalized_views
        GROUP BY normalized_path
        ORDER BY views DESC
        LIMIT page_limit
    ) t;

    RETURN COALESCE(result, '[]'::json);
END;
$$;

CREATE OR REPLACE FUNCTION get_realtime_visitors()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    SELECT json_build_object(
        'active_now', (
            SELECT COUNT(*)
            FROM traffic_sessions
            WHERE ended_at >= now() - interval '5 minutes'
        ),
        'pages', COALESCE((
            SELECT json_agg(row_to_json(p))
            FROM (
                SELECT
                    COALESCE(NULLIF(regexp_replace(split_part(last_page, '?', 1), '/+$', ''), ''), '/') AS path,
                    COUNT(*) AS count
                FROM traffic_sessions
                WHERE ended_at >= now() - interval '5 minutes'
                GROUP BY path
                ORDER BY count DESC
                LIMIT 10
            ) p
        ), '[]'::json)
    ) INTO result;

    RETURN result;
END;
$$;
