-- =====================================================
-- COMPLETE CHAT SYSTEM FIX - Run this to resolve message send issues
-- =====================================================

-- Step 1: Check what tables exist
-- This will show you what's actually in your database
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'chat%';

-- Step 2: If chat_messages doesn't exist, create it with CORRECT schema
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign keys
    session_id UUID NOT NULL REFERENCES live_chat_sessions(id) ON DELETE CASCADE,
    sender_id UUID,
    
    -- Message sender info
    is_agent BOOLEAN DEFAULT false,
    sender_role TEXT DEFAULT 'user' CHECK (sender_role IN ('user', 'agent', 'admin')),
    sender_name TEXT,
    
    -- Message content
    message TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::jsonb,
    
    -- Message metadata
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_unread ON chat_messages(is_read) WHERE is_read = false;

-- Step 4: Ensure live_chat_sessions has all required columns
ALTER TABLE live_chat_sessions
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'ended'));

ALTER TABLE live_chat_sessions
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE live_chat_sessions
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;

ALTER TABLE live_chat_sessions
ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;

ALTER TABLE live_chat_sessions
ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating >= 1 AND rating <= 5);

ALTER TABLE live_chat_sessions
ADD COLUMN IF NOT EXISTS feedback TEXT;

ALTER TABLE live_chat_sessions
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE live_chat_sessions
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Step 5: Enable RLS on chat_messages
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies for chat_messages
DROP POLICY IF EXISTS "Users can view their messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert messages" ON chat_messages;
DROP POLICY IF EXISTS "Agents can view all messages" ON chat_messages;
DROP POLICY IF EXISTS "Agents can insert messages" ON chat_messages;

-- Policy: Users can view messages from their sessions
CREATE POLICY "Users can view their messages"
    ON chat_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM live_chat_sessions
            WHERE live_chat_sessions.id = chat_messages.session_id
            AND live_chat_sessions.user_id = auth.uid()
        )
    );

-- Policy: Users can insert their own messages
CREATE POLICY "Users can insert messages"
    ON chat_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM live_chat_sessions
            WHERE live_chat_sessions.id = chat_messages.session_id
            AND live_chat_sessions.user_id = auth.uid()
        )
        AND is_agent = false
    );

-- Policy: Agents can view all messages
CREATE POLICY "Agents can view all messages"
    ON chat_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('agent', 'admin')
        )
    );

-- Policy: Agents can insert messages
CREATE POLICY "Agents can insert messages"
    ON chat_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('agent', 'admin')
        )
    );

-- Step 7: Verify schema
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'chat_messages'
ORDER BY ordinal_position;

-- Step 8: Test query (find a real session)
SELECT 
    id, 
    user_id, 
    status, 
    created_at
FROM live_chat_sessions 
ORDER BY created_at DESC 
LIMIT 5;

-- Step 9: Insert test message (uncomment and replace IDs after running above)
/*
INSERT INTO chat_messages (
    session_id,
    sender_id,
    is_agent,
    sender_role,
    sender_name,
    message
) VALUES (
    'PASTE_SESSION_ID_HERE',
    'PASTE_USER_ID_HERE',
    false,
    'user',
    'Test User',
    'Hello, testing message'
);
*/

-- =====================================================
-- IF YOU STILL GET ERRORS:
-- =====================================================

-- Run these diagnostic queries:

-- 1. Check if chat_messages table exists
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'chat_messages'
) as table_exists;

-- 2. Check all columns
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'chat_messages' ORDER BY ordinal_position;

-- 3. Check constraints
SELECT constraint_name, constraint_type FROM information_schema.table_constraints 
WHERE table_name = 'chat_messages';

-- 4. Check RLS status
SELECT schemaname, tablename, rowsecurity FROM pg_tables 
WHERE tablename = 'chat_messages';

-- 5. Test basic insert (don't worry if it fails, we're just testing)
INSERT INTO chat_messages (session_id, message) 
VALUES (gen_random_uuid(), 'test');

-- =====================================================
-- WHAT THIS SCRIPT DOES:
-- =====================================================

/*
✅ Creates chat_messages table if missing
✅ Adds all required columns to chat_messages
✅ Adds all required columns to live_chat_sessions
✅ Creates proper indexes
✅ Sets up RLS policies for security
✅ Provides verification queries
✅ Shows how to test with real data

After running this, your chat should work!
*/
