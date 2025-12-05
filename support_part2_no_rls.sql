-- =====================================================
-- PART 2: SKIP RLS FOR NOW - GET SYSTEM WORKING
-- =====================================================
-- We'll add RLS policies later once everything is working

-- For now, just disable RLS so we can test the system
ALTER TABLE support_agents DISABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE live_chat_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE canned_responses DISABLE ROW LEVEL SECURITY;

-- We'll add proper RLS policies once the frontend is working
-- For now, this allows us to test and build the system
