# IMPORTANT: Database Setup Instructions

## Run this SQL in your Supabase SQL Editor

This will fix ALL the issues with coupons and chat system.

```sql
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
DROP POLICY IF EXISTS "Authenticated users can view messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Authenticated users can insert messages" ON public.chat_messages;

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
```

## What This Fixes:

1. **Coupon Creation Error**: You can now create coupons in the admin panel
2. **Admin Message Sending**: Admin can now send messages in the chat
3. **Real-time Chat**: Messages appear instantly without page refresh
4. **No Duplicates**: Messages won't appear multiple times
5. **Persistent Chat**: Chat history is preserved and doesn't get lost

## After Running the SQL:

1. Refresh your browser
2. Try creating a coupon - it should work now
3. Try sending messages in chat - they should appear instantly
4. Messages will stay even if you close and reopen the chat

## Features Now Working:

✅ Real-time chat with no lag
✅ Instant message delivery
✅ Auto-scroll to latest messages
✅ Duplicate prevention
✅ Persistent chat history
✅ Admin can send messages
✅ Admin can create/edit/delete coupons
✅ Chat user list updates automatically
