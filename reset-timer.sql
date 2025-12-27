-- Reset the reminder timer to allow testing the email sending again immediately
-- Run this in Supabase SQL Editor
UPDATE profiles
SET last_reminder_sent_at = NULL
WHERE email = 'abdelrahmansandoby@gmail.com';

-- Verify the change
SELECT email, last_reminder_sent_at FROM profiles WHERE email = 'abdelrahmansandoby@gmail.com';
