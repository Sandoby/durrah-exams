-- =====================================================
-- DURRAH SUPPORT SYSTEM DATABASE SCHEMA
-- =====================================================
-- This migration adds comprehensive support system infrastructure
-- including agents, tickets, live chat, and role-based access

-- =====================================================
-- 1. ADD ROLE TO PROFILES TABLE
-- =====================================================

-- Add role column to existing profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'tutor' 
CHECK (role IN ('admin', 'agent', 'tutor'));

-- Create index for role lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- =====================================================
-- 2. SUPPORT AGENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS support_agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'agent' CHECK (role IN ('admin', 'agent')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    avatar_url TEXT,
    department TEXT CHECK (department IN ('technical', 'billing', 'general')),
    languages TEXT[] DEFAULT ARRAY['en'],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES support_agents(id),
    last_active TIMESTAMPTZ,
    total_tickets_handled INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0.00,
    is_online BOOLEAN DEFAULT false
);

-- Indexes for support_agents
CREATE INDEX IF NOT EXISTS idx_support_agents_status ON support_agents(status);
CREATE INDEX IF NOT EXISTS idx_support_agents_role ON support_agents(role);
CREATE INDEX IF NOT EXISTS idx_support_agents_online ON support_agents(is_online);
CREATE INDEX IF NOT EXISTS idx_support_agents_user_id ON support_agents(user_id);

-- =====================================================
-- 3. SUPPORT TICKETS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    user_email TEXT NOT NULL,
    user_name TEXT,
    
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('technical', 'billing', 'feature_request', 'bug', 'other')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_user', 'resolved', 'closed')),
    
    assigned_to UUID REFERENCES support_agents(id),
    assigned_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    
    first_response_at TIMESTAMPTZ,
    first_response_time_minutes INTEGER,
    resolution_time_minutes INTEGER,
    
    tags TEXT[],
    attachments JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT
);

-- Indexes for support_tickets
CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_created ON support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_category ON support_tickets(category);

-- =====================================================
-- 4. TICKET MESSAGES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS ticket_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id),
    sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'agent', 'system')),
    sender_name TEXT,
    
    message TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT false,
    attachments JSONB DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    is_read BOOLEAN DEFAULT false
);

-- Indexes for ticket_messages
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_created ON ticket_messages(created_at DESC);

-- =====================================================
-- 5. LIVE CHAT SESSIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS live_chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    user_email TEXT,
    user_name TEXT,
    
    agent_id UUID REFERENCES support_agents(id),
    status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'ended')),
    
    started_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    duration_minutes INTEGER,
    
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for live_chat_sessions
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON live_chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_agent ON live_chat_sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON live_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_started ON live_chat_sessions(started_at DESC);

-- =====================================================
-- 6. CHAT MESSAGES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES live_chat_sessions(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id),
    sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'agent', 'system')),
    sender_name TEXT,
    
    message TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    is_read BOOLEAN DEFAULT false
);

-- Indexes for chat_messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at DESC);

-- =====================================================
-- 7. AGENT ACTIVITY LOGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES support_agents(id),
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for agent_activity_logs
CREATE INDEX IF NOT EXISTS idx_activity_logs_agent ON agent_activity_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON agent_activity_logs(created_at DESC);

-- =====================================================
-- 8. CANNED RESPONSES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS canned_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT,
    language TEXT DEFAULT 'en',
    created_by UUID REFERENCES support_agents(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    usage_count INTEGER DEFAULT 0
);

-- Indexes for canned_responses
CREATE INDEX IF NOT EXISTS idx_canned_responses_category ON canned_responses(category);
CREATE INDEX IF NOT EXISTS idx_canned_responses_language ON canned_responses(language);

-- =====================================================
-- 9. HELPER FUNCTIONS
-- =====================================================

-- Function to generate ticket numbers
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
    year TEXT;
    count INTEGER;
    ticket_num TEXT;
BEGIN
    year := TO_CHAR(NOW(), 'YYYY');
    
    -- Get count of tickets this year
    SELECT COUNT(*) INTO count
    FROM support_tickets
    WHERE ticket_number LIKE 'TKT-' || year || '-%';
    
    -- Generate ticket number
    ticket_num := 'TKT-' || year || '-' || LPAD((count + 1)::TEXT, 5, '0');
    
    RETURN ticket_num;
END;
$$ LANGUAGE plpgsql;

-- Function to update ticket updated_at timestamp
CREATE OR REPLACE FUNCTION update_ticket_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update ticket timestamp
DROP TRIGGER IF EXISTS trigger_update_ticket_timestamp ON support_tickets;
CREATE TRIGGER trigger_update_ticket_timestamp
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_ticket_timestamp();

-- Function to calculate response time
CREATE OR REPLACE FUNCTION calculate_response_time()
RETURNS TRIGGER AS $$
BEGIN
    -- If this is the first agent response
    IF NEW.sender_type = 'agent' AND 
       (SELECT first_response_at FROM support_tickets WHERE id = NEW.ticket_id) IS NULL THEN
        
        UPDATE support_tickets
        SET first_response_at = NEW.created_at,
            first_response_time_minutes = EXTRACT(EPOCH FROM (NEW.created_at - created_at)) / 60
        WHERE id = NEW.ticket_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to calculate response time
DROP TRIGGER IF EXISTS trigger_calculate_response_time ON ticket_messages;
CREATE TRIGGER trigger_calculate_response_time
    AFTER INSERT ON ticket_messages
    FOR EACH ROW
    EXECUTE FUNCTION calculate_response_time();

-- =====================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE support_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE canned_responses ENABLE ROW LEVEL SECURITY;

-- Support Agents Policies
CREATE POLICY "Admins can view all agents"
    ON support_agents FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Agents can view themselves"
    ON support_agents FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Admins can insert agents"
    ON support_agents FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admins can update agents"
    ON support_agents FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Support Tickets Policies
CREATE POLICY "Users can view their own tickets"
    ON support_tickets FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Agents can view all tickets"
    ON support_tickets FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'agent')
        )
    );

CREATE POLICY "Users can create tickets"
    ON support_tickets FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Agents can update tickets"
    ON support_tickets FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'agent')
        )
    );

-- Ticket Messages Policies
CREATE POLICY "Users can view messages for their tickets"
    ON ticket_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM support_tickets
            WHERE support_tickets.id = ticket_messages.ticket_id
            AND support_tickets.user_id = auth.uid()
        )
        AND is_internal = false
    );

CREATE POLICY "Agents can view all messages"
    ON ticket_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'agent')
        )
    );

CREATE POLICY "Users can send messages to their tickets"
    ON ticket_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM support_tickets
            WHERE support_tickets.id = ticket_messages.ticket_id
            AND support_tickets.user_id = auth.uid()
        )
        AND sender_type = 'user'
    );

CREATE POLICY "Agents can send messages"
    ON ticket_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'agent')
        )
        AND sender_type = 'agent'
    );

-- Chat Sessions Policies
CREATE POLICY "Users can view their own chat sessions"
    ON live_chat_sessions FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Agents can view all chat sessions"
    ON live_chat_sessions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'agent')
        )
    );

CREATE POLICY "Users can create chat sessions"
    ON live_chat_sessions FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Agents can update chat sessions"
    ON live_chat_sessions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'agent')
        )
    );

-- Chat Messages Policies
CREATE POLICY "Users can view messages for their sessions"
    ON chat_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM live_chat_sessions
            WHERE live_chat_sessions.id = chat_messages.session_id
            AND live_chat_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Agents can view all chat messages"
    ON chat_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'agent')
        )
    );

CREATE POLICY "Users can send chat messages"
    ON chat_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM live_chat_sessions
            WHERE live_chat_sessions.id = chat_messages.session_id
            AND live_chat_sessions.user_id = auth.uid()
        )
        AND sender_type = 'user'
    );

CREATE POLICY "Agents can send chat messages"
    ON chat_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'agent')
        )
        AND sender_type = 'agent'
    );

-- Canned Responses Policies
CREATE POLICY "Agents can view canned responses"
    ON canned_responses FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'agent')
        )
    );

CREATE POLICY "Agents can create canned responses"
    ON canned_responses FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'agent')
        )
    );

-- =====================================================
-- 11. INITIAL DATA
-- =====================================================

-- Insert some default canned responses
INSERT INTO canned_responses (title, content, category, language) VALUES
('Welcome Message', 'Hello! Thank you for contacting Durrah support. How can I help you today?', 'general', 'en'),
('Technical Issue', 'I understand you''re experiencing a technical issue. Could you please provide more details about what you''re seeing?', 'technical', 'en'),
('Billing Question', 'I''ll be happy to help with your billing question. Let me look into that for you.', 'billing', 'en'),
('Issue Resolved', 'Great! I''m glad we could resolve your issue. Is there anything else I can help you with?', 'general', 'en'),
('Follow Up', 'I''ll follow up on this and get back to you shortly. Thank you for your patience!', 'general', 'en')
ON CONFLICT DO NOTHING;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
