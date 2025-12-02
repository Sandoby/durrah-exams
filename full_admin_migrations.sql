-- ============================================
-- FULL ADMIN CONTROL DASHBOARD
-- Additional Database Migrations (Phases 3-9)
-- ============================================

-- ============================================
-- PHASE 3: REVENUE & FINANCIAL MANAGEMENT
-- ============================================

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'EGP',
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
  payment_method TEXT,
  transaction_id TEXT UNIQUE,
  subscription_plan TEXT,
  subscription_duration TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_id ON transactions(transaction_id);

-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all transactions" ON transactions
  FOR SELECT USING (true);

CREATE POLICY "System can insert transactions" ON transactions
  FOR INSERT WITH CHECK (true);

-- ============================================
-- PHASE 5: AUTOMATED WORKFLOWS
-- ============================================

-- Automated workflows table
CREATE TABLE IF NOT EXISTS automated_workflows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL, -- subscription_expiring, inactive_user, failed_payment, new_user, high_value_user
  trigger_conditions JSONB DEFAULT '{}'::jsonb,
  actions JSONB DEFAULT '[]'::jsonb, -- Array of actions to execute
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES support_agents(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflows_trigger ON automated_workflows(trigger_type);
CREATE INDEX IF NOT EXISTS idx_workflows_active ON automated_workflows(is_active) WHERE is_active = true;

-- Workflow executions table
CREATE TABLE IF NOT EXISTS workflow_executions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID REFERENCES automated_workflows(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'success', 'failed')),
  result JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_user ON workflow_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_executed ON workflow_executions(executed_at DESC);

ALTER TABLE automated_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage workflows" ON automated_workflows FOR ALL USING (true);
CREATE POLICY "Admins can view executions" ON workflow_executions FOR SELECT USING (true);

-- ============================================
-- PHASE 6: COMMUNICATION TOOLS
-- ============================================

-- Email campaigns table
CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  segment_filters JSONB DEFAULT '{}'::jsonb, -- User segment criteria
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  total_recipients INTEGER DEFAULT 0,
  total_sent INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  created_by UUID REFERENCES support_agents(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_scheduled ON email_campaigns(scheduled_at);

-- Email campaign sends (individual emails)
CREATE TABLE IF NOT EXISTS email_campaign_sends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  user_email TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_sends_campaign ON email_campaign_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_sends_user ON email_campaign_sends(user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_sends_status ON email_campaign_sends(status);

-- In-app announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'error')),
  target_segment JSONB DEFAULT '{}'::jsonb, -- User segment criteria
  is_active BOOLEAN DEFAULT true,
  starts_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ends_at TIMESTAMP WITH TIME ZONE,
  total_views INTEGER DEFAULT 0,
  total_dismissals INTEGER DEFAULT 0,
  created_by UUID REFERENCES support_agents(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_announcements_dates ON announcements(starts_at, ends_at);

-- Announcement views
CREATE TABLE IF NOT EXISTS announcement_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  dismissed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(announcement_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_announcement_views_announcement ON announcement_views(announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_views_user ON announcement_views(user_id);

ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaign_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage campaigns" ON email_campaigns FOR ALL USING (true);
CREATE POLICY "Admins can view sends" ON email_campaign_sends FOR SELECT USING (true);
CREATE POLICY "Admins can manage announcements" ON announcements FOR ALL USING (true);
CREATE POLICY "Users can view own announcement views" ON announcement_views FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own views" ON announcement_views FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- PHASE 7: SUPPORT SYSTEM
-- ============================================

-- Support tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number SERIAL UNIQUE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  user_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_user', 'resolved', 'closed')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  category TEXT, -- billing, technical, feature_request, other
  assigned_to UUID REFERENCES support_agents(id),
  sla_due_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_created ON support_tickets(created_at DESC);

-- Ticket messages table
CREATE TABLE IF NOT EXISTS ticket_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_staff BOOLEAN DEFAULT false,
  message TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_created ON ticket_messages(created_at);

-- Canned responses table
CREATE TABLE IF NOT EXISTS canned_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  shortcut TEXT UNIQUE, -- e.g., /welcome, /refund
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES support_agents(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_canned_responses_shortcut ON canned_responses(shortcut);
CREATE INDEX IF NOT EXISTS idx_canned_responses_active ON canned_responses(is_active) WHERE is_active = true;

-- Knowledge base categories
CREATE TABLE IF NOT EXISTS kb_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Knowledge base articles
CREATE TABLE IF NOT EXISTS kb_articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES kb_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  tags TEXT[],
  view_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  created_by UUID REFERENCES support_agents(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kb_articles_category ON kb_articles(category_id);
CREATE INDEX IF NOT EXISTS idx_kb_articles_published ON kb_articles(is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_kb_articles_views ON kb_articles(view_count DESC);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE canned_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tickets" ON support_tickets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create tickets" ON support_tickets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage tickets" ON support_tickets FOR ALL USING (true);

CREATE POLICY "Users can view own ticket messages" ON ticket_messages 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM support_tickets WHERE id = ticket_messages.ticket_id AND user_id = auth.uid())
  );
CREATE POLICY "Users can add messages to own tickets" ON ticket_messages 
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM support_tickets WHERE id = ticket_messages.ticket_id AND user_id = auth.uid())
  );
CREATE POLICY "Admins can manage ticket messages" ON ticket_messages FOR ALL USING (true);

CREATE POLICY "Admins can manage canned responses" ON canned_responses FOR ALL USING (true);
CREATE POLICY "Everyone can view published KB" ON kb_articles FOR SELECT USING (is_published = true);
CREATE POLICY "Admins can manage KB" ON kb_articles FOR ALL USING (true);
CREATE POLICY "Everyone can view KB categories" ON kb_categories FOR SELECT USING (is_published = true);
CREATE POLICY "Admins can manage KB categories" ON kb_categories FOR ALL USING (true);

-- ============================================
-- PHASE 9: SECURITY & COMPLIANCE
-- ============================================

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID, -- Can be NULL for system actions
  admin_email TEXT,
  action_type TEXT NOT NULL, -- user_updated, subscription_activated, ticket_created, etc.
  resource_type TEXT NOT NULL, -- user, subscription, ticket, etc.
  resource_id UUID,
  changes JSONB DEFAULT '{}'::jsonb, -- Before/after values
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- Admin roles table
CREATE TABLE IF NOT EXISTS admin_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '{}'::jsonb, -- Detailed permissions object
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin users table (separate from support_agents for more granular control)
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role_id UUID REFERENCES admin_roles(id),
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(is_active) WHERE is_active = true;

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs" ON audit_logs FOR SELECT USING (true);
CREATE POLICY "System can insert audit logs" ON audit_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Super admins can manage roles" ON admin_roles FOR ALL USING (true);
CREATE POLICY "Super admins can manage admin users" ON admin_users FOR ALL USING (true);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to log audit action
CREATE OR REPLACE FUNCTION log_audit_action(
  p_admin_id UUID,
  p_admin_email TEXT,
  p_action_type TEXT,
  p_resource_type TEXT,
  p_resource_id UUID,
  p_changes JSONB DEFAULT '{}'::jsonb,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (
    admin_id, admin_email, action_type, resource_type, resource_id, 
    changes, ip_address, user_agent
  )
  VALUES (
    p_admin_id, p_admin_email, p_action_type, p_resource_type, p_resource_id,
    p_changes, p_ip_address, p_user_agent
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get revenue statistics
CREATE OR REPLACE FUNCTION get_revenue_stats(
  p_start_date TIMESTAMP DEFAULT NULL,
  p_end_date TIMESTAMP DEFAULT NULL
)
RETURNS TABLE (
  total_revenue DECIMAL,
  total_transactions BIGINT,
  successful_transactions BIGINT,
  failed_transactions BIGINT,
  refunded_transactions BIGINT,
  average_transaction DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE WHEN status = 'success' THEN amount ELSE 0 END), 0)::DECIMAL,
    COUNT(*)::BIGINT,
    COUNT(CASE WHEN status = 'success' THEN 1 END)::BIGINT,
    COUNT(CASE WHEN status = 'failed' THEN 1 END)::BIGINT,
    COUNT(CASE WHEN status = 'refunded' THEN 1 END)::BIGINT,
    COALESCE(AVG(CASE WHEN status = 'success' THEN amount END), 0)::DECIMAL
  FROM transactions
  WHERE (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at <= p_end_date);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get ticket statistics
CREATE OR REPLACE FUNCTION get_ticket_stats()
RETURNS TABLE (
  total_tickets BIGINT,
  open_tickets BIGINT,
  in_progress_tickets BIGINT,
  resolved_tickets BIGINT,
  average_resolution_time INTERVAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT,
    COUNT(CASE WHEN status = 'open' THEN 1 END)::BIGINT,
    COUNT(CASE WHEN status = 'in_progress' THEN 1 END)::BIGINT,
    COUNT(CASE WHEN status = 'resolved' OR status = 'closed' THEN 1 END)::BIGINT,
    AVG(CASE WHEN resolved_at IS NOT NULL THEN resolved_at - created_at END)
  FROM support_tickets;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SEED DATA (Default Roles)
-- ============================================

-- Insert default admin roles
INSERT INTO admin_roles (name, description, permissions) VALUES
  ('Super Admin', 'Full system access', '{"all": true}'::jsonb),
  ('Admin', 'Most features except system config', '{"users": true, "subscriptions": true, "support": true, "analytics": true}'::jsonb),
  ('Support Agent', 'Support and tickets only', '{"support": true, "tickets": true, "chat": true}'::jsonb),
  ('Analyst', 'Read-only analytics access', '{"analytics": true, "reports": true}'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- ANALYTICS VIEWS (Enhanced)
-- ============================================

-- Revenue by plan view
CREATE OR REPLACE VIEW revenue_by_plan AS
SELECT
  subscription_plan as plan,
  COUNT(*) as transaction_count,
  SUM(amount) as total_revenue,
  AVG(amount) as average_revenue
FROM transactions
WHERE status = 'success'
GROUP BY subscription_plan;

-- Daily revenue view
CREATE OR REPLACE VIEW daily_revenue AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as transactions,
  SUM(CASE WHEN status = 'success' THEN amount ELSE 0 END) as revenue,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count
FROM transactions
GROUP BY DATE(created_at)
ORDER BY date DESC
LIMIT 90;

-- Ticket metrics view
CREATE OR REPLACE VIEW ticket_metrics AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_tickets,
  COUNT(CASE WHEN status = 'open' THEN 1 END) as open_tickets,
  COUNT(CASE WHEN status = 'resolved' OR status = 'closed' THEN 1 END) as resolved_tickets,
  AVG(EXTRACT(EPOCH FROM (COALESCE(resolved_at, NOW()) - created_at))) / 3600 as avg_resolution_hours
FROM support_tickets
GROUP BY DATE(created_at)
ORDER BY date DESC
LIMIT 90;

COMMENT ON TABLE transactions IS 'All payment transactions and subscriptions';
COMMENT ON TABLE automated_workflows IS 'Automated workflows for user engagement and retention';
COMMENT ON TABLE email_campaigns IS 'Email marketing campaigns';
COMMENT ON TABLE support_tickets IS 'Customer support tickets';
COMMENT ON TABLE audit_logs IS 'Audit trail of all admin actions';
COMMENT ON TABLE admin_roles IS 'Role-based access control roles';
COMMENT ON TABLE admin_users IS 'Admin user accounts with role assignments';
