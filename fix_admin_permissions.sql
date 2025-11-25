-- Fix Admin Panel Permissions
-- The Admin Panel uses frontend-only authentication (password/access code).
-- Therefore, Supabase requests are made as 'public' (anonymous) users.
-- We must allow PUBLIC access to necessary tables for the Admin Panel to function.

-- 1. PROFILES (Users Tab)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to view all profiles" ON profiles;
DROP POLICY IF EXISTS "public_view_profiles" ON profiles;

CREATE POLICY "public_view_profiles"
ON profiles FOR SELECT
TO public
USING (true);

-- 2. COUPONS (Coupons Tab)
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access" ON coupons;
DROP POLICY IF EXISTS "Allow admin write access" ON coupons;
DROP POLICY IF EXISTS "public_manage_coupons" ON coupons;

-- Allow public to view and manage coupons (Admin Panel needs this)
CREATE POLICY "public_manage_coupons"
ON coupons FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- 3. CHAT MESSAGES (Chat Tab)
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their messages" ON chat_messages;
DROP POLICY IF EXISTS "Allow message insertion" ON chat_messages;
DROP POLICY IF EXISTS "public_manage_chat_messages" ON chat_messages;

-- Allow public to view and insert messages (Admin sends as public)
CREATE POLICY "public_manage_chat_messages"
ON chat_messages FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- 4. CHAT RATINGS (If used)
CREATE TABLE IF NOT EXISTS chat_ratings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE chat_ratings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_manage_chat_ratings" ON chat_ratings;

CREATE POLICY "public_manage_chat_ratings"
ON chat_ratings FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- 5. SUPPORT AGENTS & ASSIGNMENTS (Already fixed, but ensuring consistency)
-- (These are covered by support_agents_schema.sql, but adding here for completeness if needed)
-- We assume support_agents_schema.sql was run successfully.
