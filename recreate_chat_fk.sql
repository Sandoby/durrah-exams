-- Drop the constraint if it exists (to be safe and ensure it points to the right place)
ALTER TABLE live_chat_sessions
DROP CONSTRAINT IF EXISTS live_chat_sessions_user_id_fkey;

-- Add the foreign key pointing to PROFILES (not auth.users)
ALTER TABLE live_chat_sessions
ADD CONSTRAINT live_chat_sessions_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
