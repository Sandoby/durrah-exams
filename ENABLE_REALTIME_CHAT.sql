-- =====================================================
-- ENABLE REALTIME FOR CHAT SYSTEM
-- Professional-grade real-time messaging
-- =====================================================

-- Add tables to the supabase_realtime publication
-- This enables postgres_changes subscriptions

ALTER PUBLICATION supabase_realtime ADD TABLE live_chat_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE support_agents;

-- Set replica identity to FULL for chat_messages
-- This allows us to receive old record values in UPDATE/DELETE events
ALTER TABLE chat_messages REPLICA IDENTITY FULL;
ALTER TABLE live_chat_sessions REPLICA IDENTITY FULL;

-- Create indexes for optimal realtime performance
CREATE INDEX IF NOT EXISTS idx_messages_session_created 
  ON chat_messages(session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sessions_agent_status 
  ON live_chat_sessions(agent_id, status, created_at DESC);

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check that tables are in supabase_realtime publication
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- Check replica identity is set to FULL
SELECT schemaname, tablename, replica_identity 
FROM pg_class 
JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid 
WHERE relname IN ('chat_messages', 'live_chat_sessions')
  AND schemaname = 'public';
