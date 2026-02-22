-- ============================================================
-- Traffic Metric Accuracy Fixes
-- Align session-level metrics with traffic_sessions
-- ============================================================

CREATE OR REPLACE FUNCTION get_traffic_overview(days_back int DEFAULT 30)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    WITH pv AS (
        SELECT *
        FROM page_views
        WHERE created_at >= now() - (days_back || ' days')::interval
    ),
    ts AS (
        SELECT *
        FROM traffic_sessions
        WHERE started_at >= now() - (days_back || ' days')::interval
    )
    SELECT json_build_object(
        'total_views', (SELECT COUNT(*) FROM pv),
        'unique_sessions', (SELECT COUNT(*) FROM ts),
        'unique_visitors', (SELECT COUNT(DISTINCT COALESCE(user_id::text, id)) FROM ts),
        'authenticated_users', (SELECT COUNT(DISTINCT user_id) FROM ts WHERE user_id IS NOT NULL),
        'anonymous_visitors', (SELECT COUNT(*) FROM ts WHERE user_id IS NULL),
        'bounce_rate', ROUND(
            (SELECT COUNT(*) FROM ts WHERE is_bounce = true)::numeric /
            NULLIF((SELECT COUNT(*) FROM ts), 0) * 100, 1
        ),
        'avg_duration', ROUND((SELECT AVG(total_duration_seconds) FROM ts WHERE total_duration_seconds > 0)),
        'mobile_pct', ROUND(
            (SELECT COUNT(*) FROM ts WHERE device_type = 'mobile')::numeric /
            NULLIF((SELECT COUNT(*) FROM ts), 0) * 100, 1
        ),
        'desktop_pct', ROUND(
            (SELECT COUNT(*) FROM ts WHERE device_type = 'desktop')::numeric /
            NULLIF((SELECT COUNT(*) FROM ts), 0) * 100, 1
        ),
        'tablet_pct', ROUND(
            (SELECT COUNT(*) FROM ts WHERE device_type = 'tablet')::numeric /
            NULLIF((SELECT COUNT(*) FROM ts), 0) * 100, 1
        )
    ) INTO result;

    RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION get_traffic_by_referrer(days_back int DEFAULT 30)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    SELECT json_agg(row_to_json(t)) INTO result
    FROM (
        SELECT
            COALESCE(
                CASE
                    WHEN referrer IS NULL OR referrer = '' THEN 'Direct'
                    WHEN referrer LIKE '%google%' THEN 'Google'
                    WHEN referrer LIKE '%facebook%' OR referrer LIKE '%fb.%' THEN 'Facebook'
                    WHEN referrer LIKE '%instagram%' THEN 'Instagram'
                    WHEN referrer LIKE '%twitter%' OR referrer LIKE '%t.co%' THEN 'Twitter/X'
                    WHEN referrer LIKE '%youtube%' THEN 'YouTube'
                    WHEN referrer LIKE '%tiktok%' THEN 'TikTok'
                    WHEN referrer LIKE '%linkedin%' THEN 'LinkedIn'
                    WHEN referrer LIKE '%whatsapp%' THEN 'WhatsApp'
                    ELSE regexp_replace(referrer, '^https?://(www\.)?', '')
                END,
                'Direct'
            ) AS source,
            COUNT(*) AS views,
            COUNT(*) AS sessions
        FROM traffic_sessions
        WHERE started_at >= now() - (days_back || ' days')::interval
        GROUP BY source
        ORDER BY views DESC
        LIMIT 15
    ) t;

    RETURN COALESCE(result, '[]'::json);
END;
$$;

CREATE OR REPLACE FUNCTION get_traffic_geo(days_back int DEFAULT 30)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    SELECT json_agg(row_to_json(t)) INTO result
    FROM (
        SELECT
            COALESCE(NULLIF(country, ''), 'Unresolved') AS country,
            COUNT(*) AS views,
            COUNT(*) AS sessions
        FROM traffic_sessions
        WHERE started_at >= now() - (days_back || ' days')::interval
        GROUP BY country
        ORDER BY views DESC
        LIMIT 20
    ) t;

    RETURN COALESCE(result, '[]'::json);
END;
$$;

CREATE OR REPLACE FUNCTION get_traffic_tech(days_back int DEFAULT 30)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    SELECT json_build_object(
        'browsers', (
            SELECT json_agg(row_to_json(b))
            FROM (
                SELECT COALESCE(browser, 'Unknown') AS name, COUNT(*) AS count
                FROM traffic_sessions
                WHERE started_at >= now() - (days_back || ' days')::interval
                GROUP BY browser ORDER BY count DESC LIMIT 10
            ) b
        ),
        'os', (
            SELECT json_agg(row_to_json(o))
            FROM (
                SELECT COALESCE(os, 'Unknown') AS name, COUNT(*) AS count
                FROM traffic_sessions
                WHERE started_at >= now() - (days_back || ' days')::interval
                GROUP BY os ORDER BY count DESC LIMIT 10
            ) o
        ),
        'devices', (
            SELECT json_agg(row_to_json(d))
            FROM (
                SELECT COALESCE(device_type, 'Unknown') AS name, COUNT(*) AS count
                FROM traffic_sessions
                WHERE started_at >= now() - (days_back || ' days')::interval
                GROUP BY device_type ORDER BY count DESC
            ) d
        )
    ) INTO result;

    RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION get_traffic_timeseries(days_back int DEFAULT 30)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    WITH pv AS (
        SELECT
            date_trunc('day', created_at)::date AS date,
            COUNT(*) AS views,
            COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) AS users
        FROM page_views
        WHERE created_at >= now() - (days_back || ' days')::interval
        GROUP BY date_trunc('day', created_at)::date
    ),
    ts AS (
        SELECT
            date_trunc('day', started_at)::date AS date,
            COUNT(*) AS sessions
        FROM traffic_sessions
        WHERE started_at >= now() - (days_back || ' days')::interval
        GROUP BY date_trunc('day', started_at)::date
    )
    SELECT json_agg(row_to_json(t)) INTO result
    FROM (
        SELECT
            COALESCE(pv.date, ts.date) AS date,
            COALESCE(pv.views, 0) AS views,
            COALESCE(ts.sessions, 0) AS sessions,
            COALESCE(pv.users, 0) AS users
        FROM pv
        FULL OUTER JOIN ts ON pv.date = ts.date
        ORDER BY date
    ) t;

    RETURN COALESCE(result, '[]'::json);
END;
$$;
