-- =====================================================
-- PART 2: RLS POLICIES ONLY
-- =====================================================
-- Run this AFTER Part 1 completes successfully

-- Enable RLS
ALTER TABLE support_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE canned_responses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "agents_select" ON support_agents;
DROP POLICY IF EXISTS "agents_insert" ON support_agents;
DROP POLICY IF EXISTS "agents_update" ON support_agents;
DROP POLICY IF EXISTS "tickets_select" ON support_tickets;
DROP POLICY IF EXISTS "tickets_insert" ON support_tickets;
DROP POLICY IF EXISTS "tickets_update" ON support_tickets;
DROP POLICY IF EXISTS "messages_select" ON ticket_messages;
DROP POLICY IF EXISTS "messages_insert" ON ticket_messages;
DROP POLICY IF EXISTS "chat_sessions_select" ON live_chat_sessions;
DROP POLICY IF EXISTS "chat_sessions_insert" ON live_chat_sessions;
DROP POLICY IF EXISTS "chat_messages_select" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert" ON chat_messages;
DROP POLICY IF EXISTS "canned_select" ON canned_responses;

-- Support Agents Policies
CREATE POLICY "agents_select" ON support_agents FOR SELECT
    USING (
        support_agents.user_id = auth.uid() 
        OR 
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    );

CREATE POLICY "agents_insert" ON support_agents FOR INSERT
    WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    );

CREATE POLICY "agents_update" ON support_agents FOR UPDATE
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    );

-- Support Tickets Policies
CREATE POLICY "tickets_select" ON support_tickets FOR SELECT
    USING (
        support_tickets.user_id = auth.uid() 
        OR 
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
    );

CREATE POLICY "tickets_insert" ON support_tickets FOR INSERT
    WITH CHECK (support_tickets.user_id = auth.uid());

CREATE POLICY "tickets_update" ON support_tickets FOR UPDATE
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
    );

-- Ticket Messages Policies
CREATE POLICY "messages_select" ON ticket_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM support_tickets 
            WHERE support_tickets.id = ticket_messages.ticket_id 
            AND support_tickets.user_id = auth.uid()
        )
        OR
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
    );

CREATE POLICY "messages_insert" ON ticket_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM support_tickets 
            WHERE support_tickets.id = ticket_messages.ticket_id 
            AND support_tickets.user_id = auth.uid()
        )
        OR
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
    );

-- Chat Sessions Policies
CREATE POLICY "chat_sessions_select" ON live_chat_sessions FOR SELECT
    USING (
        live_chat_sessions.user_id = auth.uid()
        OR
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
    );

CREATE POLICY "chat_sessions_insert" ON live_chat_sessions FOR INSERT
    WITH CHECK (live_chat_sessions.user_id = auth.uid());

-- Chat Messages Policies
CREATE POLICY "chat_messages_select" ON chat_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM live_chat_sessions 
            WHERE live_chat_sessions.id = chat_messages.session_id 
            AND live_chat_sessions.user_id = auth.uid()
        )
        OR
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
    );

CREATE POLICY "chat_messages_insert" ON chat_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM live_chat_sessions 
            WHERE live_chat_sessions.id = chat_messages.session_id 
            AND live_chat_sessions.user_id = auth.uid()
        )
        OR
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
    );

-- Canned Responses Policies
CREATE POLICY "canned_select" ON canned_responses FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
    );
