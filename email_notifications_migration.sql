-- Email Notifications System Migration
-- Adds subscription tracking and email logging functionality

-- 1. Add subscription and email tracking columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT TRUE;

-- 2. Create email_logs table for tracking sent emails
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL, -- 'welcome', 'subscription_reminder_7d', 'subscription_reminder_3d', 'subscription_expired', 'subscription_expired_3d'
  recipient_email TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL, -- 'sent', 'failed'
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON public.email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_email_type ON public.email_logs(email_type);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_expires ON public.profiles(subscription_expires_at) WHERE subscription_expires_at IS NOT NULL;

-- 4. Enable RLS on email_logs
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- 5. Create policies for email_logs (admins and users can view their own logs)
CREATE POLICY "Users can view their own email logs"
  ON public.email_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert email logs"
  ON public.email_logs
  FOR INSERT
  WITH CHECK (true);

-- 6. Grant necessary permissions
GRANT SELECT ON public.email_logs TO authenticated;
GRANT INSERT ON public.email_logs TO service_role;

-- 7. Add comment for documentation
COMMENT ON TABLE public.email_logs IS 'Tracks all email notifications sent to users for welcome and subscription reminders';
COMMENT ON COLUMN public.profiles.subscription_expires_at IS 'Date when user subscription expires';
COMMENT ON COLUMN public.profiles.last_reminder_sent_at IS 'Last time a subscription reminder was sent';
COMMENT ON COLUMN public.profiles.email_notifications_enabled IS 'Whether user wants to receive email notifications';
