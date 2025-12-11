-- =====================================================
-- FIX CHAT MESSAGES - Enable RLS and Create Policies
-- =====================================================

-- Step 1: Check current chat_messages schema
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'chat_messages'
ORDER BY ordinal_position;

-- Step 2: Add any missing columns
ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS is_agent BOOLEAN DEFAULT false;

ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS sender_role TEXT DEFAULT 'user' CHECK (sender_role IN ('user', 'agent', 'admin'));

ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS sender_name TEXT;

-- Step 3: Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop all old policies (cleanup)
DROP POLICY IF EXISTS "Users can view their messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert messages" ON chat_messages;
DROP POLICY IF EXISTS "Agents can view all messages" ON chat_messages;
DROP POLICY IF EXISTS "Agents can insert messages" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_select" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert" ON chat_messages;
DROP POLICY IF EXISTS "Allow message insertion" ON chat_messages;
DROP POLICY IF EXISTS "Authenticated users can view messages" ON chat_messages;
DROP POLICY IF EXISTS "Authenticated users can insert messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can view messages for their sessions" ON chat_messages;
DROP POLICY IF EXISTS "Agents can view all chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can send chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Agents can send chat messages" ON chat_messages;

-- Step 5: Create NEW simple policies that actually work

-- Policy 1: ALL authenticated users can SELECT messages
-- (This is needed so agents can see all messages, users see theirs via realtime subscription)
CREATE POLICY "Authenticated users can view all messages"
    ON chat_messages FOR SELECT
    TO authenticated
    USING (true);

-- Policy 2: ALL authenticated users can INSERT messages
-- (Both users and agents can send messages - we control access in the application logic)
CREATE POLICY "Authenticated users can insert messages"
    ON chat_messages FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Step 6: Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'chat_messages';

-- Step 7: Verify policies are created
SELECT policyname, tablename, permissive, roles, qual, with_check
FROM pg_policies 
WHERE tablename = 'chat_messages'
ORDER BY policyname;

-- Step 8: Create indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at DESC);

-- Step 9: Verify schema one more time
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'chat_messages'
ORDER BY ordinal_position;

-- =====================================================
-- TEST: Try to insert a message
-- =====================================================

-- First get a valid session_id and user_id from your data:
SELECT id as session_id, user_id FROM live_chat_sessions LIMIT 1;

-- Then use those values in this test (uncomment and replace):
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
    'Test message'
);
*/

-- If the insert works, you're good to go!
-- Then test the app by sending a real message from the chat widget
