-- Add column to store Firebase Cloud Messaging token for mobile push notifications
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS fcm_token text;

-- Create an index for faster lookups if we ever need to find users by token (optional but good practice)
CREATE INDEX IF NOT EXISTS idx_profiles_fcm_token ON profiles(fcm_token);

-- Comment
COMMENT ON COLUMN profiles.fcm_token IS 'Firebase Cloud Messaging token for mobile push notifications';
