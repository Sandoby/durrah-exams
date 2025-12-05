-- =====================================================
-- FIX LIVE CHAT SESSIONS SCHEMA
-- Add missing columns: is_ended, ended_at, started_at
-- Remove old columns: status, closed_at if they exist
-- =====================================================

-- First check what columns exist
-- Run this query first to see current schema:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'live_chat_sessions';

-- Add missing columns if they don't exist
ALTER TABLE live_chat_sessions 
ADD COLUMN IF NOT EXISTS is_ended BOOLEAN DEFAULT false;

ALTER TABLE live_chat_sessions 
ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;

ALTER TABLE live_chat_sessions 
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT NOW();

-- If you have old 'status' column, migrate the data
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'live_chat_sessions' AND column_name = 'status'
    ) THEN
        -- Migrate data from status to is_ended
        UPDATE live_chat_sessions 
        SET is_ended = CASE 
            WHEN status IN ('closed', 'ended') THEN true 
            ELSE false 
        END
        WHERE is_ended IS NULL;
    END IF;
END $$;

-- If you have old 'closed_at' column, migrate the data
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'live_chat_sessions' AND column_name = 'closed_at'
    ) THEN
        -- Migrate data from closed_at to ended_at
        UPDATE live_chat_sessions 
        SET ended_at = closed_at
        WHERE ended_at IS NULL AND closed_at IS NOT NULL;
    END IF;
END $$;

-- Create or update indexes
CREATE INDEX IF NOT EXISTS idx_chat_sessions_ended ON live_chat_sessions(is_ended);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON live_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_agent ON live_chat_sessions(agent_id);

-- Add updated_at column if missing (needed for ordering)
ALTER TABLE live_chat_sessions 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_live_chat_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS live_chat_sessions_updated_at ON live_chat_sessions;
CREATE TRIGGER live_chat_sessions_updated_at
    BEFORE UPDATE ON live_chat_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_live_chat_sessions_updated_at();

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'live_chat_sessions'
ORDER BY ordinal_position;
