-- =====================================================
-- DIAGNOSTIC QUERY
-- =====================================================
-- Run this to see what columns actually exist in support_agents table

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'support_agents' 
AND table_schema = 'public'
ORDER BY ordinal_position;
