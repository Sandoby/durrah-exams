-- 1. Safely add table to Realtime publication
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
END $$;

-- 2. Create a SECURITY DEFINER function to bypass RLS for Admin Panel usage
CREATE OR REPLACE FUNCTION send_notifications_batch(notifications_data JSONB)
RETURNS VOID AS $$
BEGIN
    INSERT INTO notifications (user_id, title, message, type, is_read)
    SELECT 
        (x->>'user_id')::uuid,
        x->>'title',
        x->>'message',
        x->>'type',
        (x->>'is_read')::boolean
    FROM jsonb_array_elements(notifications_data) x;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Simplified, standard RLS policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can manage all notifications" ON public.notifications;
DROP POLICY IF EXISTS "Select notifications" ON public.notifications;
DROP POLICY IF EXISTS "Insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Update notifications" ON public.notifications;
DROP POLICY IF EXISTS "Delete notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can manage own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;

-- SELECT/UPDATE: Users can see and update their own
CREATE POLICY "Users can manage own notifications" ON public.notifications
FOR ALL USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- INSERT: Needs to be open for the welcome message during registration (where auth.uid might be new)
-- OR strictly: Users can insert their own.
CREATE POLICY "Users can insert own notifications" ON public.notifications
FOR INSERT WITH CHECK (auth.uid() = user_id);
