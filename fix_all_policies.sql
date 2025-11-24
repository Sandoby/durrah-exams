-- Comprehensive fix for RLS policies
-- Run this in your Supabase SQL Editor

-- ============================================
-- FIX COUPONS TABLE POLICIES
-- ============================================

-- Drop existing coupon policies
DROP POLICY IF EXISTS "Anyone can view active coupons" ON public.coupons;

-- Allow all authenticated users to view coupons
CREATE POLICY "Authenticated users can view coupons" ON public.coupons
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow all authenticated users to insert coupons (for admin panel)
CREATE POLICY "Authenticated users can insert coupons" ON public.coupons
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow all authenticated users to update coupons (for admin panel)
CREATE POLICY "Authenticated users can update coupons" ON public.coupons
    FOR UPDATE
    TO authenticated
    USING (true);

-- Allow all authenticated users to delete coupons (for admin panel)
CREATE POLICY "Authenticated users can delete coupons" ON public.coupons
    FOR DELETE
    TO authenticated
    USING (true);

-- ============================================
-- FIX CHAT_MESSAGES TABLE POLICIES
-- ============================================

-- Drop ALL existing chat message policies
DROP POLICY IF EXISTS "Users can view their own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert their own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Allow message insertion" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can view their messages" ON public.chat_messages;

-- Allow all authenticated users to view all messages (needed for admin)
CREATE POLICY "Authenticated users can view messages" ON public.chat_messages
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow all authenticated users to insert messages (both users and admins)
CREATE POLICY "Authenticated users can insert messages" ON public.chat_messages
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- ============================================
-- ENABLE REALTIME FOR CHAT
-- ============================================

-- Enable realtime for chat_messages table
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- Note: If you get an error about publication already containing the table, that's fine - it means it's already enabled
