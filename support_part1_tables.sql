-- =====================================================
-- PART 1: PROFILES AND TABLES ONLY
-- =====================================================
-- Run this FIRST, then check if it works before running Part 2

-- Add role column to profiles
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

-- Create support_agents table
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

-- Create support_tickets table
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

-- Create ticket_messages table
CREATE TABLE IF NOT EXISTS ticket_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id),
    sender_type TEXT NOT NULL,
    message TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create live_chat_sessions table
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

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES live_chat_sessions(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id),
    sender_type TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create canned_responses table
CREATE TABLE IF NOT EXISTS canned_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create helper function
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

-- Insert sample data
INSERT INTO canned_responses (title, content, category) VALUES
('Welcome', 'Hello! How can I help you today?', 'general'),
('Technical', 'I understand you have a technical issue. Let me help.', 'technical')
ON CONFLICT DO NOTHING;
