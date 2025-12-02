-- ============================================
-- ADMIN DASHBOARD ENHANCEMENTS & CHAT FIXES
-- Database Migrations
-- ============================================

-- 1. USER ACTIVITY TRACKING
-- ============================================
CREATE TABLE IF NOT EXISTS user_activity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  activity_data JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_activity_user ON user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_type ON user_activity(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_created ON user_activity(created_at DESC);

-- Enable RLS
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

-- Policies: Only admins can view activity
CREATE POLICY "Admins can view all activity" ON user_activity
  FOR SELECT USING (true); -- Will be restricted by admin auth

CREATE POLICY "System can insert activity" ON user_activity
  FOR INSERT WITH CHECK (true);

-- ============================================
-- 2. SUPPORT NOTES
-- ============================================
CREATE TABLE IF NOT EXISTS support_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_by UUID REFERENCES support_agents(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_notes_user ON support_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_support_notes_created ON support_notes(created_at DESC);

ALTER TABLE support_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage notes" ON support_notes
  FOR ALL USING (true);

-- ============================================
-- 3. CHAT IMPROVEMENTS
-- ============================================

-- Add typing indicators
CREATE TABLE IF NOT EXISTS chat_typing (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  is_typing BOOLEAN DEFAULT false,
  is_admin BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add read receipts to chat_messages
ALTER TABLE chat_messages 
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS read_by_admin BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_chat_messages_read ON chat_messages(read_at) WHERE read_at IS NULL;

-- Add file attachments support
ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Add last_message_at to profiles for sorting
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_chat_message_at TIMESTAMP WITH TIME ZONE;

-- ============================================
-- 4. CHAT RATINGS (if not exists)
-- ============================================
CREATE TABLE IF NOT EXISTS chat_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_ratings_user ON chat_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_ratings_created ON chat_ratings(created_at DESC);

ALTER TABLE chat_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own ratings" ON chat_ratings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all ratings" ON chat_ratings
  FOR SELECT USING (true);

-- ============================================
-- 5. HELPER FUNCTIONS
-- ============================================

-- Function to log user activity
CREATE OR REPLACE FUNCTION log_user_activity(
  p_user_id UUID,
  p_activity_type TEXT,
  p_activity_data JSONB DEFAULT '{}'::jsonb,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_activity_id UUID;
BEGIN
  INSERT INTO user_activity (user_id, activity_type, activity_data, ip_address, user_agent)
  VALUES (p_user_id, p_activity_type, p_activity_data, p_ip_address, p_user_agent)
  RETURNING id INTO v_activity_id;
  
  RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user statistics
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID)
RETURNS TABLE (
  total_exams BIGINT,
  total_submissions BIGINT,
  active_exams BIGINT,
  last_login TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM exams WHERE tutor_id = p_user_id)::BIGINT,
    (SELECT COUNT(*) FROM submissions s 
     JOIN exams e ON s.exam_id = e.id 
     WHERE e.tutor_id = p_user_id)::BIGINT,
    (SELECT COUNT(*) FROM exams WHERE tutor_id = p_user_id AND is_active = true)::BIGINT,
    (SELECT MAX(created_at) FROM user_activity WHERE user_id = p_user_id AND activity_type = 'login');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark chat messages as read
CREATE OR REPLACE FUNCTION mark_messages_read(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE chat_messages
  SET read_at = NOW(), read_by_admin = true
  WHERE user_id = p_user_id 
    AND is_admin = false 
    AND read_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread message count
CREATE OR REPLACE FUNCTION get_unread_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM chat_messages
    WHERE user_id = p_user_id 
      AND is_admin = true 
      AND read_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. TRIGGERS
-- ============================================

-- Update last_chat_message_at on new message
CREATE OR REPLACE FUNCTION update_last_chat_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET last_chat_message_at = NEW.created_at
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_last_chat_message ON chat_messages;
CREATE TRIGGER trigger_update_last_chat_message
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_last_chat_message();

-- ============================================
-- 7. ANALYTICS VIEWS
-- ============================================

-- View for platform statistics
CREATE OR REPLACE VIEW platform_stats AS
SELECT
  (SELECT COUNT(*) FROM profiles) as total_users,
  (SELECT COUNT(*) FROM profiles WHERE subscription_status = 'active') as active_subscriptions,
  (SELECT COUNT(*) FROM exams) as total_exams,
  (SELECT COUNT(*) FROM submissions) as total_submissions,
  (SELECT COUNT(*) FROM profiles WHERE created_at >= NOW() - INTERVAL '24 hours') as new_users_24h,
  (SELECT COUNT(*) FROM profiles WHERE created_at >= NOW() - INTERVAL '7 days') as new_users_7d,
  (SELECT COUNT(*) FROM profiles WHERE created_at >= NOW() - INTERVAL '30 days') as new_users_30d;

-- View for user growth (daily)
CREATE OR REPLACE VIEW user_growth_daily AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as new_users,
  SUM(COUNT(*)) OVER (ORDER BY DATE(created_at)) as cumulative_users
FROM profiles
GROUP BY DATE(created_at)
ORDER BY date DESC
LIMIT 90; -- Last 90 days

-- View for subscription distribution
CREATE OR REPLACE VIEW subscription_distribution AS
SELECT
  COALESCE(subscription_plan, 'free') as plan,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM profiles), 2) as percentage
FROM profiles
GROUP BY subscription_plan;

-- ============================================
-- 8. SAMPLE DATA FOR TESTING (Optional)
-- ============================================

-- Log some sample activities (only if needed for testing)
-- INSERT INTO user_activity (user_id, activity_type, activity_data)
-- SELECT id, 'login', '{"ip": "127.0.0.1"}'::jsonb
-- FROM profiles
-- LIMIT 5;

COMMENT ON TABLE user_activity IS 'Tracks all user activities for admin monitoring';
COMMENT ON TABLE support_notes IS 'Internal notes about users for support team';
COMMENT ON TABLE chat_typing IS 'Real-time typing indicators for chat';
COMMENT ON TABLE chat_ratings IS 'User ratings for support chat sessions';
