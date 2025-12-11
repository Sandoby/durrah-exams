-- =====================================================
-- QUICK DIAGNOSTIC - Run this to get exact error info
-- =====================================================

-- 1. List all tables in public schema
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 2. Check if chat_messages exists
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'chat_messages'
) as "chat_messages_exists";

-- 3. Check if live_chat_sessions exists
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'live_chat_sessions'
) as "live_chat_sessions_exists";

-- 4. If chat_messages exists, show its schema
-- Uncomment if you want to see it:
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'chat_messages'
ORDER BY ordinal_position;

-- 5. If live_chat_sessions exists, show its schema
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'live_chat_sessions'
ORDER BY ordinal_position;

-- 6. Show any active sessions
SELECT id, user_id, user_email, status, created_at 
FROM live_chat_sessions 
ORDER BY created_at DESC 
LIMIT 10;

-- 7. Show any existing messages
SELECT id, session_id, sender_id, message, created_at 
FROM chat_messages 
ORDER BY created_at DESC 
LIMIT 10;

-- 8. Check if support_agents table exists
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'support_agents'
) as "support_agents_exists";

-- 9. Show support agents
SELECT id, name, email, is_active FROM support_agents LIMIT 10;

-- 10. Check RLS on chat_messages
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'chat_messages';

-- 11. Check RLS policies
SELECT policyname, tablename FROM pg_policies 
WHERE tablename = 'chat_messages';
