-- =====================================================
-- FIX REAL-TIME CHAT ISSUES
-- =====================================================

BEGIN;

-- 1. Enable Realtime Replication for Chat Tables
-- This is often the missing step for Supabase Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE live_chat_sessions;

-- 2. Ensure RLS Policies allow Real-time Subscriptions
-- We drop and re-create policies to be absolutely sure

-- Enable RLS
ALTER TABLE live_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "chat_sessions_select" ON live_chat_sessions;
DROP POLICY IF EXISTS "chat_sessions_insert" ON live_chat_sessions;
DROP POLICY IF EXISTS "chat_sessions_update" ON live_chat_sessions;
DROP POLICY IF EXISTS "chat_messages_select" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert" ON chat_messages;

-- Re-create Policies

-- Chat Sessions: Users see their own, Agents/Admins see all
CREATE POLICY "chat_sessions_select" ON live_chat_sessions FOR SELECT
    USING (
        user_id = auth.uid()
        OR
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
    );

CREATE POLICY "chat_sessions_insert" ON live_chat_sessions FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "chat_sessions_update" ON live_chat_sessions FOR UPDATE
    USING (
        user_id = auth.uid()
        OR
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
    );

-- Chat Messages: Users see messages in their sessions, Agents/Admins see all
-- Note: We use a simpler policy for Agents to avoid complex joins if possible, but the join is necessary for security.
CREATE POLICY "chat_messages_select" ON chat_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM live_chat_sessions 
            WHERE live_chat_sessions.id = session_id 
            AND live_chat_sessions.user_id = auth.uid()
        )
        OR
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
    );

CREATE POLICY "chat_messages_insert" ON chat_messages FOR INSERT
    WITH CHECK (
        -- User can insert if they own the session
        EXISTS (
            SELECT 1 FROM live_chat_sessions 
            WHERE live_chat_sessions.id = session_id 
            AND live_chat_sessions.user_id = auth.uid()
        )
        OR
        -- Agents/Admins can insert anywhere (or we could restrict to assigned sessions, but let's be permissive for now to fix bugs)
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
    );

COMMIT;
