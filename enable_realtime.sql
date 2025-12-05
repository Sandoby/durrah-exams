-- Enable Realtime for chat tables
begin;

-- Check if publication exists, if not create it (usually exists in Supabase)
-- alter publication supabase_realtime add table chat_messages;
-- alter publication supabase_realtime add table live_chat_sessions;

-- To be safe, we try to add them. If they are already added, this might throw a warning or error depending on PG version,
-- but usually 'alter publication ... add table' is idempotent-ish or we can check first.
-- Simpler approach for Supabase:

alter publication supabase_realtime add table chat_messages;
alter publication supabase_realtime add table live_chat_sessions;

commit;
