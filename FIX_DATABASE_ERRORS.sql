-- =====================================================
-- FIX DATABASE ERRORS - 409 CONFLICT & MISSING COLUMNS
-- =====================================================

-- ERROR 1: 409 Conflict when posting to chat_messages
-- This usually means foreign key constraint issue
-- Let's verify and fix the schema

-- =====================================================
-- 1. CHECK CURRENT SCHEMA
-- =====================================================

-- Run these queries first to see what's in your database:
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'chat_messages'
ORDER BY ordinal_position;

-- Check live_chat_sessions schema
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'live_chat_sessions'
ORDER BY ordinal_position;

-- Check profiles schema
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- =====================================================
-- 2. FIX: Add missing columns to chat_messages
-- =====================================================

-- The chat_messages table might be missing columns
ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS is_agent BOOLEAN DEFAULT false;

ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS sender_role TEXT DEFAULT 'user' CHECK (sender_role IN ('user', 'agent', 'admin'));

ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS sender_name TEXT;

-- Make sure created_at exists
ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- =====================================================
-- 3. FIX: Add missing columns to live_chat_sessions
-- =====================================================

-- The live_chat_sessions table needs these columns
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

-- =====================================================
-- 4. FIX: Add missing columns to profiles
-- =====================================================

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free';

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS subscription_plan TEXT;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ;

-- =====================================================
-- 5. FIX: Verify Foreign Keys
-- =====================================================

-- Check if sender_id in chat_messages references auth.users
-- If there's an issue, sessions might not have valid user_id
-- Let's check for orphaned records

-- Count chat_messages with invalid foreign keys
SELECT COUNT(*) as invalid_sender_ids
FROM chat_messages
WHERE sender_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = chat_messages.sender_id);

-- Count live_chat_sessions with invalid user_id references
SELECT COUNT(*) as invalid_user_ids
FROM live_chat_sessions
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE id = live_chat_sessions.user_id);

-- =====================================================
-- 6. SOLUTION: If foreign key check fails, fix it
-- =====================================================

-- If there are invalid records, run this to clean them up:
DELETE FROM chat_messages 
WHERE sender_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = sender_id);

DELETE FROM live_chat_sessions
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user_id);

-- =====================================================
-- 7. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON live_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_agent ON live_chat_sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON live_chat_sessions(status);

-- =====================================================
-- 8. VERIFY EVERYTHING
-- =====================================================

-- Check final chat_messages schema
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'chat_messages'
ORDER BY ordinal_position;

-- Test inserting a message (if you have a valid session_id and user_id)
-- Uncomment after running the above:
/*
INSERT INTO chat_messages (
    session_id, 
    sender_id, 
    is_agent, 
    sender_role, 
    sender_name, 
    message, 
    is_read
) VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,  -- Replace with real session_id
    auth.uid(),  -- Replace with real user_id
    false,
    'user',
    'Test User',
    'Test message',
    false
);
*/

-- =====================================================
-- SUMMARY OF FIXES
-- =====================================================

/*
This script fixes:

1. ❌ 409 Conflict error:
   - Ensures foreign keys are valid (sender_id references auth.users)
   - Removes orphaned records that cause constraint violations
   - Verifies live_chat_sessions.user_id is valid

2. ❌ "updated_at" missing in profiles:
   - Adds updated_at column to profiles table
   - Sets default to NOW()

3. ✅ Schema alignment:
   - Ensures chat_messages has all required columns (is_agent, sender_role, sender_name)
   - Ensures live_chat_sessions has all required columns (status, timestamps, rating)

4. ✅ Performance:
   - Creates proper indexes on foreign keys

After running this, your chat system should work without errors!
*/
