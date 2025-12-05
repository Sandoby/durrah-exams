-- Add role column to support_agents if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_agents' AND column_name = 'role') THEN
        ALTER TABLE support_agents ADD COLUMN role text DEFAULT 'agent';
    END IF;
END $$;

-- Reload PostgREST schema cache to fix the "Could not find the 'role' column" error
NOTIFY pgrst, 'reload schema';
