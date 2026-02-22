-- ============================================================
-- Traffic Tracking Enhancements
-- Adds custom event tracking + retention helpers
-- ============================================================

CREATE TABLE IF NOT EXISTS traffic_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id text NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    path text NOT NULL,
    event_name text NOT NULL,
    event_category text,
    event_value numeric,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_traffic_events_created_at ON traffic_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_traffic_events_session_id ON traffic_events(session_id);
CREATE INDEX IF NOT EXISTS idx_traffic_events_event_name ON traffic_events(event_name);
CREATE INDEX IF NOT EXISTS idx_traffic_events_user_id ON traffic_events(user_id);

ALTER TABLE traffic_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anonymous traffic event inserts" ON traffic_events;
CREATE POLICY "Allow anonymous traffic event inserts"
    ON traffic_events FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to read traffic events" ON traffic_events;
CREATE POLICY "Allow authenticated users to read traffic events"
    ON traffic_events FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE OR REPLACE FUNCTION get_top_events(days_back int DEFAULT 30, event_limit int DEFAULT 20)
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
            event_name,
            COALESCE(event_category, 'general') AS event_category,
            COUNT(*) AS total_events,
            COUNT(DISTINCT session_id) AS unique_sessions,
            COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) AS unique_users
        FROM traffic_events
        WHERE created_at >= now() - (days_back || ' days')::interval
        GROUP BY event_name, COALESCE(event_category, 'general')
        ORDER BY total_events DESC
        LIMIT event_limit
    ) t;

    RETURN COALESCE(result, '[]'::json);
END;
$$;

CREATE OR REPLACE FUNCTION cleanup_old_traffic_data(retention_days int DEFAULT 365)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_views int := 0;
    deleted_sessions int := 0;
    deleted_events int := 0;
BEGIN
    DELETE FROM page_views
    WHERE created_at < now() - (retention_days || ' days')::interval;
    GET DIAGNOSTICS deleted_views = ROW_COUNT;

    DELETE FROM traffic_sessions
    WHERE started_at < now() - (retention_days || ' days')::interval;
    GET DIAGNOSTICS deleted_sessions = ROW_COUNT;

    DELETE FROM traffic_events
    WHERE created_at < now() - (retention_days || ' days')::interval;
    GET DIAGNOSTICS deleted_events = ROW_COUNT;

    RETURN json_build_object(
        'deleted_page_views', deleted_views,
        'deleted_sessions', deleted_sessions,
        'deleted_events', deleted_events
    );
END;
$$;
