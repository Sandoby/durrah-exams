-- =====================================================
-- ULTRA-SIMPLE MIGRATION - NO CONSTRAINTS
-- =====================================================
-- Run each section separately and check for errors

-- =====================================================
-- SECTION 1: ADD ROLE TO PROFILES
-- =====================================================

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
-- SECTION 2: CREATE SUPPORT AGENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS support_agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_admin BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    is_online BOOLEAN DEFAULT false
);

-- =====================================================
-- SECTION 3: CREATE SUPPORT TICKETS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    user_email TEXT NOT NULL,
    user_name TEXT,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT,
    priority TEXT DEFAULT 'medium',
    is_open BOOLEAN DEFAULT true,
    is_resolved BOOLEAN DEFAULT false,
    assigned_to UUID REFERENCES support_agents(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- SECTION 4: CREATE TICKET MESSAGES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS ticket_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id),
    sender_type TEXT NOT NULL,
    message TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- SECTION 5: CREATE CHAT SESSIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS live_chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    user_email TEXT,
    user_name TEXT,
    agent_id UUID REFERENCES support_agents(id),
    is_active BOOLEAN DEFAULT true,
    is_ended BOOLEAN DEFAULT false,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

-- =====================================================
-- SECTION 6: CREATE CHAT MESSAGES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES live_chat_sessions(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id),
    sender_type TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- SECTION 7: CREATE CANNED RESPONSES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS canned_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- SECTION 8: HELPER FUNCTION FOR TICKET NUMBERS
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
-- SECTION 9: ENABLE RLS
-- =====================================================

ALTER TABLE support_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- SECTION 10: CREATE BASIC POLICIES
-- =====================================================

-- Agents policies
DROP POLICY IF EXISTS "agents_select" ON support_agents;
CREATE POLICY "agents_select" ON support_agents FOR SELECT
    USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "agents_insert" ON support_agents;
CREATE POLICY "agents_insert" ON support_agents FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Tickets policies
DROP POLICY IF EXISTS "tickets_select" ON support_tickets;
CREATE POLICY "tickets_select" ON support_tickets FOR SELECT
    USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent')));

DROP POLICY IF EXISTS "tickets_insert" ON support_tickets;
CREATE POLICY "tickets_insert" ON support_tickets FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- =====================================================
-- SECTION 11: INSERT SAMPLE DATA
-- =====================================================

INSERT INTO canned_responses (title, content, category) VALUES
('Welcome', 'Hello! How can I help you today?', 'general'),
('Technical', 'I understand you have a technical issue. Let me help.', 'technical')
ON CONFLICT DO NOTHING;

-- =====================================================
-- DONE!
-- =====================================================
