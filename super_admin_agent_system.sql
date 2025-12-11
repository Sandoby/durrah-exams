-- =====================================================
-- SUPER ADMIN & AGENT SYSTEM - COMPLETE SCHEMA
-- =====================================================
-- Run this to set up proper admin/agent control system

-- =====================================================
-- 1. ENSURE SUPPORT_AGENTS TABLE EXISTS WITH PROPER COLUMNS
-- =====================================================

CREATE TABLE IF NOT EXISTS support_agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    access_code TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ,
    total_chats_handled INTEGER DEFAULT 0,
    permissions JSONB DEFAULT '{"can_view_payments": true, "can_extend_subscriptions": true, "can_cancel_subscriptions": false}'::jsonb,
    notes TEXT
);

-- Add new columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='support_agents' AND column_name='last_login') THEN
        ALTER TABLE support_agents ADD COLUMN last_login TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='support_agents' AND column_name='total_chats_handled') THEN
        ALTER TABLE support_agents ADD COLUMN total_chats_handled INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='support_agents' AND column_name='permissions') THEN
        ALTER TABLE support_agents ADD COLUMN permissions JSONB DEFAULT '{"can_view_payments": true, "can_extend_subscriptions": true, "can_cancel_subscriptions": false}'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='support_agents' AND column_name='notes') THEN
        ALTER TABLE support_agents ADD COLUMN notes TEXT;
    END IF;
END $$;

-- =====================================================
-- 2. AGENT ACTIVITY LOGS
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES support_agents(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL, -- 'login', 'chat_assigned', 'subscription_extended', 'user_viewed', etc.
    user_id UUID, -- Not a foreign key - just stores UUID for reference
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add user_id column if it doesn't exist (for existing tables)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agent_activity_logs' AND column_name='user_id') THEN
        ALTER TABLE agent_activity_logs ADD COLUMN user_id UUID;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_agent_activity_agent ON agent_activity_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_activity_created ON agent_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_activity_user ON agent_activity_logs(user_id) WHERE user_id IS NOT NULL;

-- =====================================================
-- 3. AGENT NOTES ON USERS
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_user_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- Just stores UUID, no foreign key constraint
    agent_id UUID REFERENCES support_agents(id) ON DELETE SET NULL,
    note TEXT NOT NULL,
    is_important BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add user_id column if it doesn't exist (for existing tables)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agent_user_notes' AND column_name='user_id') THEN
        ALTER TABLE agent_user_notes ADD COLUMN user_id UUID NOT NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_agent_notes_user ON agent_user_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_notes_agent ON agent_user_notes(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_notes_important ON agent_user_notes(is_important) WHERE is_important = true;

-- =====================================================
-- 4. SUBSCRIPTION CHANGE HISTORY
-- =====================================================

CREATE TABLE IF NOT EXISTS subscription_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- Just stores UUID, no foreign key constraint
    changed_by_agent_id UUID REFERENCES support_agents(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- 'extended', 'cancelled', 'upgraded', 'downgraded'
    previous_plan TEXT,
    new_plan TEXT,
    previous_end_date TIMESTAMPTZ,
    new_end_date TIMESTAMPTZ,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add user_id column if it doesn't exist (for existing tables)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscription_history' AND column_name='user_id') THEN
        ALTER TABLE subscription_history ADD COLUMN user_id UUID NOT NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_subscription_history_user ON subscription_history(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_agent ON subscription_history(changed_by_agent_id) WHERE changed_by_agent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscription_history_created ON subscription_history(created_at DESC);

-- =====================================================
-- 5. CANNED RESPONSES FOR AGENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS canned_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'general', -- 'greeting', 'billing', 'technical', 'closing'
    shortcut TEXT UNIQUE, -- e.g., '/hello', '/refund'
    created_by_agent_id UUID REFERENCES support_agents(id),
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_canned_responses_category ON canned_responses(category);
CREATE INDEX IF NOT EXISTS idx_canned_responses_active ON canned_responses(is_active);

-- =====================================================
-- 6. HELPER FUNCTIONS
-- =====================================================

-- Function to generate unique access code for agents
CREATE OR REPLACE FUNCTION generate_access_code()
RETURNS TEXT AS $$
DECLARE
    code TEXT;
    exists BOOLEAN;
BEGIN
    LOOP
        -- Generate 8-character alphanumeric code
        code := upper(substring(md5(random()::text) from 1 for 8));
        
        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM support_agents WHERE access_code = code) INTO exists;
        
        -- If code doesn't exist, return it
        IF NOT exists THEN
            RETURN code;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to log agent activity
CREATE OR REPLACE FUNCTION log_agent_activity(
    p_agent_id UUID,
    p_action_type TEXT,
    p_user_id UUID DEFAULT NULL,
    p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO agent_activity_logs (agent_id, action_type, user_id, details)
    VALUES (p_agent_id, p_action_type, p_user_id, p_details);
END;
$$ LANGUAGE plpgsql;

-- Function to extend subscription (agents only)
CREATE OR REPLACE FUNCTION extend_subscription(
    p_user_id UUID,
    p_agent_id UUID,
    p_days INTEGER,
    p_reason TEXT DEFAULT 'Extended by support agent'
)
RETURNS JSONB AS $$
DECLARE
    v_profile RECORD;
    v_new_end_date TIMESTAMPTZ;
BEGIN
    -- Get current subscription info
    SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found');
    END IF;
    
    -- Calculate new end date
    v_new_end_date := COALESCE(v_profile.subscription_end_date, NOW()) + (p_days || ' days')::interval;
    
    -- Update profile
    UPDATE profiles
    SET subscription_end_date = v_new_end_date,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Log the change
    INSERT INTO subscription_history (
        user_id, changed_by_agent_id, action,
        previous_end_date, new_end_date, reason
    ) VALUES (
        p_user_id, p_agent_id, 'extended',
        v_profile.subscription_end_date, v_new_end_date, p_reason
    );
    
    -- Log agent activity
    PERFORM log_agent_activity(
        p_agent_id,
        'subscription_extended',
        p_user_id,
        jsonb_build_object(
            'days', p_days,
            'new_end_date', v_new_end_date,
            'reason', p_reason
        )
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'new_end_date', v_new_end_date,
        'message', format('Subscription extended by %s days', p_days)
    );
END;
$$ LANGUAGE plpgsql;

-- Function to cancel subscription (super admin only)
CREATE OR REPLACE FUNCTION cancel_subscription(
    p_user_id UUID,
    p_admin_password TEXT,
    p_reason TEXT DEFAULT 'Cancelled by super admin'
)
RETURNS JSONB AS $$
DECLARE
    v_profile RECORD;
BEGIN
    -- Verify super admin password
    IF p_admin_password != '2352206' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid admin password');
    END IF;
    
    -- Get current subscription info
    SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found');
    END IF;
    
    -- Cancel subscription
    UPDATE profiles
    SET subscription_status = 'cancelled',
        subscription_end_date = NOW(),
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Log the change
    INSERT INTO subscription_history (
        user_id, action,
        previous_plan, previous_end_date, new_end_date, reason
    ) VALUES (
        p_user_id, 'cancelled',
        v_profile.subscription_plan, v_profile.subscription_end_date, NOW(), p_reason
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Subscription cancelled successfully'
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. RLS POLICIES
-- =====================================================

ALTER TABLE support_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_user_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE canned_responses ENABLE ROW LEVEL SECURITY;

-- Support agents - allow public access (authentication handled by UI)
DROP POLICY IF EXISTS "public_access_agents" ON support_agents;
CREATE POLICY "public_access_agents" ON support_agents FOR ALL TO public USING (true);

-- Agent activity logs - public read
DROP POLICY IF EXISTS "public_access_activity" ON agent_activity_logs;
CREATE POLICY "public_access_activity" ON agent_activity_logs FOR ALL TO public USING (true);

-- Agent notes - public access
DROP POLICY IF EXISTS "public_access_notes" ON agent_user_notes;
CREATE POLICY "public_access_notes" ON agent_user_notes FOR ALL TO public USING (true);

-- Subscription history - public read
DROP POLICY IF EXISTS "public_access_sub_history" ON subscription_history;
CREATE POLICY "public_access_sub_history" ON subscription_history FOR ALL TO public USING (true);

-- Canned responses - public access
DROP POLICY IF EXISTS "public_access_canned" ON canned_responses;
CREATE POLICY "public_access_canned" ON canned_responses FOR ALL TO public USING (true);

-- =====================================================
-- 8. INSERT DEFAULT CANNED RESPONSES
-- =====================================================

INSERT INTO canned_responses (title, content, category, shortcut) VALUES
('Welcome Message', 'Hello! Thank you for contacting Durrah support. How can I assist you today?', 'greeting', '/hello'),
('Account Information', 'I''ll help you with your account information. Can you please provide more details about what you need?', 'general', '/account'),
('Subscription Query', 'I can see your subscription details. Let me help you with that.', 'billing', '/sub'),
('Technical Issue', 'I understand you''re experiencing a technical issue. Let me investigate this for you.', 'technical', '/tech'),
('Refund Request', 'I''ll process your refund request. Our refund policy allows refunds within 14 days of purchase.', 'billing', '/refund'),
('Closing Message', 'Is there anything else I can help you with today? Thank you for using Durrah!', 'closing', '/close')
ON CONFLICT (shortcut) DO NOTHING;

-- =====================================================
-- COMPLETE! 
-- =====================================================
-- Your admin/agent system is now ready.
-- Super Admin Password: 2352206
-- Agents will be created through the admin panel with unique access codes.
