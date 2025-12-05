-- Add tutorial_completed column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS tutorial_completed BOOLEAN DEFAULT FALSE;

-- Add comment
COMMENT ON COLUMN profiles.tutorial_completed IS 'Tracks whether user has completed the dashboard tutorial';
