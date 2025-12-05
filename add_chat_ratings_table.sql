-- =====================================================
-- CREATE CHAT RATINGS TABLE
-- Store user ratings and feedback for chat sessions
-- =====================================================

CREATE TABLE IF NOT EXISTS chat_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES live_chat_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_chat_ratings_session ON chat_ratings(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_ratings_user ON chat_ratings(user_id);

-- Enable RLS
ALTER TABLE chat_ratings ENABLE ROW LEVEL SECURITY;

-- Users can insert their own ratings
CREATE POLICY "Users can insert their own ratings" ON chat_ratings
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can view their own ratings
CREATE POLICY "Users can view their own ratings" ON chat_ratings
    FOR SELECT
    USING (auth.uid() = user_id);

-- Agents and admins can view all ratings
CREATE POLICY "Agents can view all ratings" ON chat_ratings
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'agent')
        )
    );
