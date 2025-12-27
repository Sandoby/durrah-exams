-- Fix RLS policies for subscription automation
-- This ensures the service role can update subscription statuses

-- First, check if the subscription_status column exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'subscription_status'
    ) THEN
        ALTER TABLE profiles ADD COLUMN subscription_status TEXT DEFAULT 'inactive';
        RAISE NOTICE 'Added subscription_status column';
    ELSE
        RAISE NOTICE 'subscription_status column already exists';
    END IF;
END $$;

-- Create or replace a policy that allows service role to update subscription status
DROP POLICY IF EXISTS "Service role can update subscription status" ON profiles;

CREATE POLICY "Service role can update subscription status"
ON profiles
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Verify the policy was created
SELECT 
    schemaname,
    tablename,
    policyname,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'profiles' 
AND policyname = 'Service role can update subscription status';

-- Show current RLS status
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'profiles';
