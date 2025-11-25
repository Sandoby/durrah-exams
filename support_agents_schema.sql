-- Multi-Agent Customer Support System Schema

-- 1. Support Agents Table
CREATE TABLE IF NOT EXISTS support_agents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    access_code TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
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

-- 3. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_assignments_agent ON chat_assignments(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_chat_assignments_status ON chat_assignments(status);
CREATE INDEX IF NOT EXISTS idx_chat_assignments_user ON chat_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_support_agents_active ON support_agents(is_active);
CREATE INDEX IF NOT EXISTS idx_support_agents_code ON support_agents(access_code);

-- 4. Enable RLS
ALTER TABLE support_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_assignments ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for support_agents

-- Drop existing policies if they exist (idempotent script)
DROP POLICY IF EXISTS "Allow viewing active support agents" ON support_agents;
DROP POLICY IF EXISTS "Allow insert for support agents" ON support_agents;

-- Allow anyone to view active agents
CREATE POLICY "Allow viewing active support agents"
ON support_agents FOR SELECT
TO public
USING (true);

-- Allow the super‑admin (authenticated) to insert new agents
CREATE POLICY "Allow insert for support agents"
ON support_agents FOR INSERT
TO authenticated
WITH CHECK (true);

-- 6. RLS Policies for chat_assignments
-- Allow users to view their own chat assignments
CREATE POLICY "Users can view their own chat assignments"
ON chat_assignments FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow authenticated users to manage chat assignments
CREATE POLICY "Allow managing chat assignments"
ON chat_assignments FOR ALL
TO authenticated
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
        code := upper(substring(md5(random()::text) from 1 for 8));
        
        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM support_agents WHERE access_code = code) INTO exists;
        
        EXIT WHEN NOT exists;
    END LOOP;
    
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- 8. Function to auto-assign chat on first agent response
CREATE OR REPLACE FUNCTION auto_assign_chat()
RETURNS TRIGGER AS $$
BEGIN
    -- If this is an admin message and no assignment exists, create one
    IF NEW.is_admin = true THEN
        INSERT INTO chat_assignments (user_id, assigned_agent_id, status)
        VALUES (NEW.user_id, NULL, 'open')
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Create trigger for auto-assignment
DROP TRIGGER IF EXISTS trigger_auto_assign_chat ON chat_messages;
CREATE TRIGGER trigger_auto_assign_chat
    AFTER INSERT ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION auto_assign_chat();
