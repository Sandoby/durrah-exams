-- Verify email notification setup for subscription automation
-- Run this in Supabase SQL Editor

-- 1. Check if email_notifications_enabled column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles' 
AND column_name IN ('email_notifications_enabled', 'last_reminder_sent_at', 'subscription_end_date');

-- 2. If the column doesn't exist, add it (with default TRUE so emails are enabled by default)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'email_notifications_enabled'
    ) THEN
        ALTER TABLE profiles ADD COLUMN email_notifications_enabled BOOLEAN DEFAULT TRUE;
        RAISE NOTICE 'Added email_notifications_enabled column';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'last_reminder_sent_at'
    ) THEN
        ALTER TABLE profiles ADD COLUMN last_reminder_sent_at TIMESTAMPTZ;
        RAISE NOTICE 'Added last_reminder_sent_at column';
    END IF;
END $$;

-- 3. Set your test account to have notifications enabled
UPDATE profiles
SET email_notifications_enabled = TRUE
WHERE email = 'abdelrahmansandoby@gmail.com';

-- 4. Verify the setup
SELECT 
    email,
    email_notifications_enabled,
    last_reminder_sent_at,
    subscription_end_date,
    subscription_status
FROM profiles
WHERE email = 'abdelrahmansandoby@gmail.com';
