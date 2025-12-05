-- Full Reset of Chat System Tables

-- 1. Drop existing tables (order matters due to foreign keys)
DROP TABLE IF EXISTS chat_messages;
DROP TABLE IF EXISTS live_chat_sessions;

-- 2. Create live_chat_sessions table
CREATE TABLE live_chat_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    agent_id UUID REFERENCES support_agents(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create chat_messages table
CREATE TABLE chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES live_chat_sessions(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID NOT NULL, -- Can be user_id or agent_id
    sender_role TEXT CHECK (sender_role IN ('user', 'agent', 'admin')) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Enable RLS (but keep policies open for now to ensure it works)
ALTER TABLE live_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- 5. Create simple policies (Allow all for now to debug, can be tightened later)
CREATE POLICY "Allow all access to live_chat_sessions" ON live_chat_sessions
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access to chat_messages" ON chat_messages
    FOR ALL USING (true) WITH CHECK (true);

-- 6. Grant permissions
GRANT ALL ON live_chat_sessions TO authenticated;
GRANT ALL ON chat_messages TO authenticated;
GRANT ALL ON live_chat_sessions TO service_role;
GRANT ALL ON chat_messages TO service_role;

-- 7. Reload schema cache
NOTIFY pgrst, 'reload schema';
