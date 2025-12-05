-- Add missing foreign key for user_id in live_chat_sessions
ALTER TABLE live_chat_sessions
ADD CONSTRAINT live_chat_sessions_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
