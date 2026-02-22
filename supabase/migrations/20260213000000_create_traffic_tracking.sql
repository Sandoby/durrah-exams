-- ============================================================
-- Traffic Tracking System - Full Migration
-- ============================================================

-- 1. Page Views Table - records every page visit
CREATE TABLE IF NOT EXISTS page_views (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id text NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    path text NOT NULL,
    page_title text,
    referrer text,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    utm_term text,
    utm_content text,
    device_type text, -- 'desktop', 'tablet', 'mobile'
    browser text,
    os text,
    screen_width int,
    screen_height int,
    language text,
    country text,
    city text,
    duration_seconds int DEFAULT 0,
    is_bounce boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- 2. Traffic Sessions Table - groups page views into sessions
CREATE TABLE IF NOT EXISTS traffic_sessions (
    id text PRIMARY KEY, -- client-generated session ID
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    first_page text NOT NULL,
    last_page text,
    referrer text,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    device_type text,
    browser text,
    os text,
    language text,
    country text,
    city text,
    page_count int DEFAULT 1,
    total_duration_seconds int DEFAULT 0,
    is_bounce boolean DEFAULT true,
    started_at timestamptz DEFAULT now(),
    ended_at timestamptz DEFAULT now()
);

-- 3. Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_path ON page_views(path);
CREATE INDEX IF NOT EXISTS idx_page_views_session_id ON page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_page_views_user_id ON page_views(user_id);
CREATE INDEX IF NOT EXISTS idx_page_views_device ON page_views(device_type);
CREATE INDEX IF NOT EXISTS idx_page_views_referrer ON page_views(referrer);
CREATE INDEX IF NOT EXISTS idx_page_views_utm_source ON page_views(utm_source);

CREATE INDEX IF NOT EXISTS idx_traffic_sessions_started_at ON traffic_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_traffic_sessions_user_id ON traffic_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_traffic_sessions_device ON traffic_sessions(device_type);

-- 4. RLS Policies
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE traffic_sessions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to INSERT (anonymous + authenticated visitors)
CREATE POLICY "Allow anonymous page view inserts"
    ON page_views FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow anonymous session inserts"
    ON traffic_sessions FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow anonymous session updates"
    ON traffic_sessions FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Only authenticated admins can SELECT (read) traffic data
-- For simplicity, allow all authenticated users to read (admin check happens in frontend)
CREATE POLICY "Allow authenticated users to read page views"
    ON page_views FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read sessions"
    ON traffic_sessions FOR SELECT
    USING (auth.role() = 'authenticated');

-- 5. Materialized view for daily traffic stats (for fast dashboard queries)
CREATE MATERIALIZED VIEW IF NOT EXISTS traffic_daily_stats AS
SELECT
    date_trunc('day', created_at)::date AS date,
    COUNT(*) AS total_views,
    COUNT(DISTINCT session_id) AS unique_sessions,
    COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) AS authenticated_users,
    COUNT(*) FILTER (WHERE user_id IS NULL) AS anonymous_views,
    COUNT(*) FILTER (WHERE is_bounce = true) AS bounces,
    ROUND(AVG(duration_seconds) FILTER (WHERE duration_seconds > 0))::int AS avg_duration,
    COUNT(*) FILTER (WHERE device_type = 'mobile') AS mobile_views,
    COUNT(*) FILTER (WHERE device_type = 'desktop') AS desktop_views,
    COUNT(*) FILTER (WHERE device_type = 'tablet') AS tablet_views
FROM page_views
GROUP BY date_trunc('day', created_at)::date
ORDER BY date DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_traffic_daily_stats_date ON traffic_daily_stats(date);

-- 6. Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_traffic_daily_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY traffic_daily_stats;
END;
$$;

-- 7. RPC function: Get traffic overview stats
CREATE OR REPLACE FUNCTION get_traffic_overview(days_back int DEFAULT 30)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    SELECT json_build_object(
        'total_views', COUNT(*),
        'unique_sessions', COUNT(DISTINCT session_id),
        'unique_visitors', COUNT(DISTINCT COALESCE(user_id::text, session_id)),
        'authenticated_users', COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL),
        'anonymous_visitors', COUNT(DISTINCT session_id) FILTER (WHERE user_id IS NULL),
        'bounce_rate', ROUND(
            (COUNT(*) FILTER (WHERE is_bounce = true))::numeric / NULLIF(COUNT(DISTINCT session_id), 0) * 100, 1
        ),
        'avg_duration', ROUND(AVG(duration_seconds) FILTER (WHERE duration_seconds > 0)),
        'mobile_pct', ROUND(
            (COUNT(*) FILTER (WHERE device_type = 'mobile'))::numeric / NULLIF(COUNT(*), 0) * 100, 1
        ),
        'desktop_pct', ROUND(
            (COUNT(*) FILTER (WHERE device_type = 'desktop'))::numeric / NULLIF(COUNT(*), 0) * 100, 1
        ),
        'tablet_pct', ROUND(
            (COUNT(*) FILTER (WHERE device_type = 'tablet'))::numeric / NULLIF(COUNT(*), 0) * 100, 1
        )
    ) INTO result
    FROM page_views
    WHERE created_at >= now() - (days_back || ' days')::interval;

    RETURN result;
END;
$$;

-- 8. RPC function: Get top pages
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
        SELECT
            path,
            COUNT(*) AS views,
            COUNT(DISTINCT session_id) AS unique_views,
            ROUND(AVG(duration_seconds) FILTER (WHERE duration_seconds > 0)) AS avg_duration,
            ROUND(
                (COUNT(*) FILTER (WHERE is_bounce = true))::numeric / NULLIF(COUNT(*), 0) * 100, 1
            ) AS bounce_rate
        FROM page_views
        WHERE created_at >= now() - (days_back || ' days')::interval
        GROUP BY path
        ORDER BY views DESC
        LIMIT page_limit
    ) t;

    RETURN COALESCE(result, '[]'::json);
END;
$$;

-- 9. RPC function: Get traffic by referrer
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
            COUNT(DISTINCT session_id) AS sessions
        FROM page_views
        WHERE created_at >= now() - (days_back || ' days')::interval
        GROUP BY source
        ORDER BY views DESC
        LIMIT 15
    ) t;

    RETURN COALESCE(result, '[]'::json);
END;
$$;

-- 10. RPC function: Get UTM campaign performance
CREATE OR REPLACE FUNCTION get_utm_performance(days_back int DEFAULT 30)
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
            utm_source,
            utm_medium,
            utm_campaign,
            COUNT(*) AS views,
            COUNT(DISTINCT session_id) AS sessions,
            COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) AS conversions
        FROM page_views
        WHERE created_at >= now() - (days_back || ' days')::interval
            AND utm_source IS NOT NULL
        GROUP BY utm_source, utm_medium, utm_campaign
        ORDER BY views DESC
        LIMIT 20
    ) t;

    RETURN COALESCE(result, '[]'::json);
END;
$$;

-- 11. RPC function: Get hourly traffic pattern
CREATE OR REPLACE FUNCTION get_hourly_traffic(days_back int DEFAULT 7)
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
            EXTRACT(HOUR FROM created_at)::int AS hour,
            COUNT(*) AS views,
            COUNT(DISTINCT session_id) AS sessions
        FROM page_views
        WHERE created_at >= now() - (days_back || ' days')::interval
        GROUP BY hour
        ORDER BY hour
    ) t;

    RETURN COALESCE(result, '[]'::json);
END;
$$;

-- 12. RPC function: Get traffic time series for charts
CREATE OR REPLACE FUNCTION get_traffic_timeseries(days_back int DEFAULT 30)
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
            date_trunc('day', created_at)::date AS date,
            COUNT(*) AS views,
            COUNT(DISTINCT session_id) AS sessions,
            COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) AS users
        FROM page_views
        WHERE created_at >= now() - (days_back || ' days')::interval
        GROUP BY date_trunc('day', created_at)::date
        ORDER BY date
    ) t;

    RETURN COALESCE(result, '[]'::json);
END;
$$;

-- 13. RPC function: Get real-time active visitors (last 5 minutes)
CREATE OR REPLACE FUNCTION get_realtime_visitors()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    SELECT json_build_object(
        'active_now', COUNT(DISTINCT session_id),
        'pages', (
            SELECT json_agg(row_to_json(p))
            FROM (
                SELECT path, COUNT(*) AS count
                FROM page_views
                WHERE created_at >= now() - interval '5 minutes'
                GROUP BY path
                ORDER BY count DESC
                LIMIT 10
            ) p
        )
    ) INTO result
    FROM page_views
    WHERE created_at >= now() - interval '5 minutes';

    RETURN result;
END;
$$;

-- 14. RPC function: Get geographic distribution
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
            COALESCE(country, 'Unknown') AS country,
            COUNT(*) AS views,
            COUNT(DISTINCT session_id) AS sessions
        FROM page_views
        WHERE created_at >= now() - (days_back || ' days')::interval
        GROUP BY country
        ORDER BY views DESC
        LIMIT 20
    ) t;

    RETURN COALESCE(result, '[]'::json);
END;
$$;

-- 15. RPC function: Get browser/OS distribution
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
                FROM page_views
                WHERE created_at >= now() - (days_back || ' days')::interval
                GROUP BY browser ORDER BY count DESC LIMIT 10
            ) b
        ),
        'os', (
            SELECT json_agg(row_to_json(o))
            FROM (
                SELECT COALESCE(os, 'Unknown') AS name, COUNT(*) AS count
                FROM page_views
                WHERE created_at >= now() - (days_back || ' days')::interval
                GROUP BY os ORDER BY count DESC LIMIT 10
            ) o
        ),
        'devices', (
            SELECT json_agg(row_to_json(d))
            FROM (
                SELECT COALESCE(device_type, 'Unknown') AS name, COUNT(*) AS count
                FROM page_views
                WHERE created_at >= now() - (days_back || ' days')::interval
                GROUP BY device_type ORDER BY count DESC
            ) d
        )
    ) INTO result;

    RETURN result;
END;
$$;
