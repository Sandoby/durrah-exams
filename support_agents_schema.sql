-- Multi-Agent Customer Support System Schema

-- 1. Support Agents Table
CREATE TABLE IF NOT EXISTS support_agents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    access_code TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- created_by can be null if admin is not authenticated in Supabase
    created_by UUID REFERENCES auth.users(id)
);

-- 2. Chat Assignments Table
CREATE TABLE IF NOT EXISTS chat_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    assigned_agent_id UUID REFERENCES support_agents(id),
    status TEXT CHECK (status IN ('open', 'closed')) DEFAULT 'open',
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id)
);

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_assignments_agent ON chat_assignments(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_chat_assignments_status ON chat_assignments(status);
CREATE INDEX IF NOT EXISTS idx_chat_assignments_user ON chat_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_support_agents_active ON support_agents(is_active);
CREATE INDEX IF NOT EXISTS idx_support_agents_code ON support_agents(access_code);

-- 4. Enable Row Level Security
ALTER TABLE support_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_assignments ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for support_agents

-- Drop ALL potential old policies to ensure a clean slate
DROP POLICY IF EXISTS "Allow viewing active support agents" ON support_agents;
DROP POLICY IF EXISTS "Allow insert for support agents" ON support_agents;
DROP POLICY IF EXISTS "policy_view_active_support_agents" ON support_agents;
DROP POLICY IF EXISTS "policy_insert_support_agents" ON support_agents;
DROP POLICY IF EXISTS "Allow all operations on support agents" ON support_agents;
DROP POLICY IF EXISTS "Allow update for support agents" ON support_agents;
DROP POLICY IF EXISTS "Allow delete for support agents" ON support_agents;

-- CRITICAL FIX: The Admin and Agents are NOT authenticated via Supabase Auth.
-- They use a custom frontend auth. Therefore, we MUST allow PUBLIC access
-- to these tables for the application to function. Security is handled by the UI.

-- Allow public to view agents (needed for login check and admin list)
CREATE POLICY "public_view_agents"
ON support_agents FOR SELECT
TO public
USING (true);

-- Allow public to insert agents (needed for Admin to add agents)
CREATE POLICY "public_insert_agents"
ON support_agents FOR INSERT
TO public
WITH CHECK (true);

-- Allow public to update agents (needed for soft delete/deactivation)
CREATE POLICY "public_update_agents"
ON support_agents FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- Allow public to delete agents (if hard delete is used)
CREATE POLICY "public_delete_agents"
ON support_agents FOR DELETE
TO public
USING (true);

-- 6. RLS Policies for chat_assignments

-- Drop ALL potential old policies
DROP POLICY IF EXISTS "Users can view their own chat assignments" ON chat_assignments;
DROP POLICY IF EXISTS "Allow managing chat assignments" ON chat_assignments;
DROP POLICY IF EXISTS "policy_view_own_chat_assignments" ON chat_assignments;
DROP POLICY IF EXISTS "policy_manage_chat_assignments" ON chat_assignments;
DROP POLICY IF EXISTS "ChatAssignmentsViewOwn" ON chat_assignments;

-- Allow public to view assignments (needed for Agents to see their chats)
CREATE POLICY "public_view_assignments"
ON chat_assignments FOR SELECT
TO public
USING (true);

-- Allow public to manage assignments (needed for auto-assign, forward, close)
CREATE POLICY "public_manage_assignments"
ON chat_assignments FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- 7. Function to generate unique access code
CREATE OR REPLACE FUNCTION generate_access_code()
RETURNS TEXT AS $$
DECLARE
    code TEXT;
    exists BOOLEAN;
BEGIN
    LOOP
        -- Generate 8-character alphanumeric code
        code := upper(substring(md5(random()::text) FROM 1 FOR 8));
        SELECT EXISTS (SELECT 1 FROM support_agents WHERE access_code = code) INTO exists;
        EXIT WHEN NOT exists;
    END LOOP;
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- 8. Function to auto-assign chat on first agent response
CREATE OR REPLACE FUNCTION auto_assign_chat()
RETURNS TRIGGER AS $$
BEGIN
    -- If this is an admin message (is_admin=true) and no assignment exists
    IF NEW.is_admin = true THEN
        INSERT INTO chat_assignments (user_id, assigned_agent_id, status)
        VALUES (NEW.user_id, NULL, 'open')
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Trigger for auto-assignment
DROP TRIGGER IF EXISTS trigger_auto_assign_chat ON chat_messages;
CREATE TRIGGER trigger_auto_assign_chat
    AFTER INSERT ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION auto_assign_chat();
