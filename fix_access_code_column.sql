-- =====================================================
-- FIX: ADD MISSING access_code COLUMN TO support_agents
-- =====================================================

-- Add access_code column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='support_agents' AND column_name='access_code') THEN
        ALTER TABLE support_agents ADD COLUMN access_code TEXT UNIQUE;
    END IF;
END $$;
