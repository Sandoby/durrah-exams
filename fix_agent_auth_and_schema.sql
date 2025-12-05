-- Add password column to support_agents for custom auth
ALTER TABLE support_agents ADD COLUMN IF NOT EXISTS password text;

-- Ensure live_chat_sessions has the status column (it should, but verifying)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'live_chat_sessions' AND column_name = 'status') THEN
        ALTER TABLE live_chat_sessions ADD COLUMN status text DEFAULT 'open';
    END IF;
END $$;

-- Reload PostgREST schema cache to fix the "Could not find the 'status' column" error
NOTIFY pgrst, 'reload schema';
