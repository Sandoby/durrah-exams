-- =====================================================
-- COMPLETE FRESH CHAT SYSTEM - CLEAN SLATE
-- =====================================================
-- WARNING: This will DROP all chat tables and recreate them
-- Make sure you have a backup if you need the data!

BEGIN;

-- =====================================================
-- STEP 1: DROP ALL OLD CHAT TABLES
-- =====================================================

DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS live_chat_sessions CASCADE;
DROP TABLE IF EXISTS chat_ratings CASCADE;

-- =====================================================
-- STEP 2: CREATE FRESH live_chat_sessions TABLE
-- =====================================================

CREATE TABLE live_chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- User info
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    user_name TEXT NOT NULL,
    
    -- Agent assignment
    agent_id UUID REFERENCES support_agents(id) ON DELETE SET NULL,
    
    -- Status flow
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'ended')),
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assigned_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Feedback
    rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
    feedback TEXT,
    
    -- Metadata
    duration_minutes INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes
CREATE INDEX idx_chat_sessions_user ON live_chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_agent ON live_chat_sessions(agent_id);
CREATE INDEX idx_chat_sessions_status ON live_chat_sessions(status);
CREATE INDEX idx_chat_sessions_created ON live_chat_sessions(created_at DESC);
CREATE INDEX idx_chat_sessions_updated ON live_chat_sessions(updated_at DESC);

-- =====================================================
-- STEP 3: CREATE FRESH chat_messages TABLE
-- =====================================================

CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign key to session
    session_id UUID NOT NULL REFERENCES live_chat_sessions(id) ON DELETE CASCADE,
    
    -- Sender info
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_agent BOOLEAN NOT NULL DEFAULT false,
    sender_role TEXT NOT NULL DEFAULT 'user' CHECK (sender_role IN ('user', 'agent', 'admin')),
    sender_name TEXT NOT NULL,
    
    -- Message content
    message TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::jsonb,
    
    -- Message metadata
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(created_at DESC);
CREATE INDEX idx_chat_messages_unread ON chat_messages(is_read) WHERE is_read = false;

-- =====================================================
-- STEP 4: CREATE FRESH chat_ratings TABLE
-- =====================================================

CREATE TABLE chat_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES live_chat_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_ratings_session ON chat_ratings(session_id);
CREATE INDEX idx_chat_ratings_user ON chat_ratings(user_id);
CREATE INDEX idx_chat_ratings_created ON chat_ratings(created_at DESC);

-- =====================================================
-- STEP 5: ENABLE AND CONFIGURE RLS
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE live_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_ratings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 6: CREATE RLS POLICIES for live_chat_sessions
-- =====================================================

-- Users can view their own sessions
CREATE POLICY "Users view own sessions"
    ON live_chat_sessions FOR SELECT
    USING (user_id = auth.uid());

-- Agents/Admins can view all sessions
CREATE POLICY "Agents view all sessions"
    ON live_chat_sessions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('agent', 'admin')
        )
    );

-- Users can create their own sessions
CREATE POLICY "Users create sessions"
    ON live_chat_sessions FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Agents/Admins can update sessions
CREATE POLICY "Agents update sessions"
    ON live_chat_sessions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('agent', 'admin')
        )
    );

-- =====================================================
-- STEP 7: CREATE RLS POLICIES for chat_messages
-- =====================================================

-- Users can view messages from their sessions
CREATE POLICY "Users view own session messages"
    ON chat_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM live_chat_sessions
            WHERE live_chat_sessions.id = chat_messages.session_id
            AND live_chat_sessions.user_id = auth.uid()
        )
    );

-- Agents/Admins can view all messages
CREATE POLICY "Agents view all messages"
    ON chat_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('agent', 'admin')
        )
    );

-- Users can insert messages in their sessions
CREATE POLICY "Users insert messages"
    ON chat_messages FOR INSERT
    WITH CHECK (
        is_agent = false
        AND
        EXISTS (
            SELECT 1 FROM live_chat_sessions
            WHERE live_chat_sessions.id = chat_messages.session_id
            AND live_chat_sessions.user_id = auth.uid()
        )
    );

-- Agents/Admins can insert messages anywhere
CREATE POLICY "Agents insert messages"
    ON chat_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('agent', 'admin')
        )
    );

-- =====================================================
-- STEP 8: CREATE RLS POLICIES for chat_ratings
-- =====================================================

-- Users can view their own ratings
CREATE POLICY "Users view own ratings"
    ON chat_ratings FOR SELECT
    USING (user_id = auth.uid());

-- Agents can view ratings
CREATE POLICY "Agents view ratings"
    ON chat_ratings FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('agent', 'admin')
        )
    );

-- Users can insert ratings
CREATE POLICY "Users insert ratings"
    ON chat_ratings FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- =====================================================
-- STEP 9: CREATE TRIGGERS FOR AUTO-UPDATING
-- =====================================================

-- Auto-update live_chat_sessions.updated_at
CREATE OR REPLACE FUNCTION update_live_chat_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_live_chat_sessions_updated_at ON live_chat_sessions;
CREATE TRIGGER trigger_update_live_chat_sessions_updated_at
    BEFORE UPDATE ON live_chat_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_live_chat_sessions_updated_at();

-- =====================================================
-- STEP 10: VERIFY SETUP
-- =====================================================

-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('live_chat_sessions', 'chat_messages', 'chat_ratings')
ORDER BY table_name;

-- Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE tablename IN ('live_chat_sessions', 'chat_messages', 'chat_ratings');

-- Check policies exist
SELECT tablename, policyname FROM pg_policies 
WHERE tablename IN ('live_chat_sessions', 'chat_messages', 'chat_ratings')
ORDER BY tablename, policyname;

-- Check chat_messages columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'chat_messages'
ORDER BY ordinal_position;

COMMIT;

-- =====================================================
-- SUCCESS!
-- =====================================================

/*
✅ Created fresh chat_messages table
✅ Created fresh live_chat_sessions table  
✅ Created fresh chat_ratings table
✅ Enabled RLS on all tables
✅ Created proper RLS policies
✅ Created indexes for performance
✅ Created auto-update triggers

Now you can:
1. Rebuild frontend: npm run build
2. Test sending messages (should work now!)
3. Check browser console for any errors
*/
