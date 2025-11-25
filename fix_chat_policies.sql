-- Fix for existing database: Drop and recreate chat_messages policies

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert their own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert messages" ON public.chat_messages;

-- Recreate policies with correct permissions
-- Allow users to view messages where they are the user_id OR any admin message to them
CREATE POLICY "Users can view their messages" ON public.chat_messages
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR is_admin = true);

-- Allow all authenticated users to insert messages (for both users and admins)
CREATE POLICY "Allow message insertion" ON public.chat_messages
    FOR INSERT
    TO authenticated
    WITH CHECK (true);
