-- =====================================================
-- CLEAN SLATE: DROP OLD TABLES AND CREATE NEW ONES
-- =====================================================

-- Drop existing support tables (if they exist from previous attempts)
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS live_chat_sessions CASCADE;
DROP TABLE IF EXISTS ticket_messages CASCADE;
DROP TABLE IF EXISTS support_tickets CASCADE;
DROP TABLE IF EXISTS support_agents CASCADE;
DROP TABLE IF EXISTS canned_responses CASCADE;
DROP TABLE IF EXISTS agent_activity_logs CASCADE;

-- Add role column to profiles (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'role'
    ) THEN
        ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'tutor';
    END IF;
END $$;

UPDATE profiles SET role = 'tutor' WHERE role IS NULL;

-- =====================================================
-- CREATE FRESH SUPPORT AGENTS TABLE
-- =====================================================

CREATE TABLE support_agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_admin BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    is_online BOOLEAN DEFAULT false,
    department TEXT,
    avatar_url TEXT
);

-- =====================================================
-- CREATE SUPPORT TICKETS TABLE
-- =====================================================

CREATE TABLE support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    user_email TEXT NOT NULL,
    user_name TEXT,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    priority TEXT DEFAULT 'medium',
    is_open BOOLEAN DEFAULT true,
    is_resolved BOOLEAN DEFAULT false,
    assigned_to UUID REFERENCES support_agents(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    rating INTEGER,
    feedback TEXT
);

-- =====================================================
-- CREATE TICKET MESSAGES TABLE
-- =====================================================

CREATE TABLE ticket_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id),
    sender_type TEXT NOT NULL,
    sender_name TEXT,
    message TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_read BOOLEAN DEFAULT false
);

-- =====================================================
-- CREATE LIVE CHAT SESSIONS TABLE
-- =====================================================

CREATE TABLE live_chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    user_email TEXT,
    user_name TEXT,
    agent_id UUID REFERENCES support_agents(id),
    is_active BOOLEAN DEFAULT true,
    is_ended BOOLEAN DEFAULT false,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    rating INTEGER,
    feedback TEXT
);

-- =====================================================
-- CREATE CHAT MESSAGES TABLE
-- =====================================================

CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES live_chat_sessions(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id),
    sender_type TEXT NOT NULL,
    sender_name TEXT,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_read BOOLEAN DEFAULT false
);

-- =====================================================
-- CREATE CANNED RESPONSES TABLE
-- =====================================================

CREATE TABLE canned_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    language TEXT DEFAULT 'en',
    created_by UUID REFERENCES support_agents(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    usage_count INTEGER DEFAULT 0
);

-- =====================================================
-- CREATE AGENT ACTIVITY LOGS TABLE
-- =====================================================

CREATE TABLE agent_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES support_agents(id),
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
    year TEXT;
    count INTEGER;
BEGIN
    year := TO_CHAR(NOW(), 'YYYY');
    SELECT COUNT(*) INTO count FROM support_tickets WHERE ticket_number LIKE 'TKT-' || year || '-%';
    RETURN 'TKT-' || year || '-' || LPAD((count + 1)::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- DISABLE RLS FOR NOW (we'll add it later)
-- =====================================================

ALTER TABLE support_agents DISABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE live_chat_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE canned_responses DISABLE ROW LEVEL SECURITY;
ALTER TABLE agent_activity_logs DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- INSERT SAMPLE DATA
-- =====================================================

INSERT INTO canned_responses (title, content, category, language) VALUES
('Welcome Message', 'Hello! Thank you for contacting Durrah support. How can I help you today?', 'general', 'en'),
('Technical Issue', 'I understand you''re experiencing a technical issue. Could you please provide more details?', 'technical', 'en'),
('Billing Question', 'I''ll be happy to help with your billing question. Let me look into that for you.', 'billing', 'en'),
('Issue Resolved', 'Great! I''m glad we could resolve your issue. Is there anything else I can help you with?', 'general', 'en')
ON CONFLICT DO NOTHING;

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================
