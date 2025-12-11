-- =====================================================
-- FIX: DISABLE RLS AND ALLOW PUBLIC ACCESS
-- =====================================================

-- Disable RLS on all agent-related tables
ALTER TABLE support_agents DISABLE ROW LEVEL SECURITY;
ALTER TABLE agent_activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE agent_user_notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE canned_responses DISABLE ROW LEVEL SECURITY;
