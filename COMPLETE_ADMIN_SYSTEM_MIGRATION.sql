    -- =====================================================
    -- COMPLETE ADMIN & AGENT SYSTEM DATABASE MIGRATION
    -- Fresh, clean schema optimized for performance
    -- =====================================================

    -- Enable UUID extension
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- =====================================================
    -- 1. DROP OLD TABLES (Clean slate)
    -- =====================================================

    DROP TABLE IF EXISTS agent_user_notes CASCADE;
    DROP TABLE IF EXISTS subscription_history CASCADE;
    DROP TABLE IF EXISTS canned_responses CASCADE;
    DROP TABLE IF EXISTS agent_activity_logs CASCADE;
    DROP TABLE IF EXISTS chat_messages CASCADE;
    DROP TABLE IF EXISTS live_chat_sessions CASCADE;
    DROP TABLE IF EXISTS support_agents CASCADE;

    -- =====================================================
    -- 2. SUPPORT AGENTS TABLE
    -- Core table for agent management
    -- =====================================================

    CREATE TABLE support_agents (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        access_code TEXT UNIQUE NOT NULL,
        is_active BOOLEAN DEFAULT true,
        
        -- Permissions stored as JSONB for flexibility
        permissions JSONB DEFAULT '{
            "can_view_payments": true,
            "can_extend_subscriptions": true,
            "can_cancel_subscriptions": false
        }'::jsonb,
        
        -- Stats
        total_chats_handled INTEGER DEFAULT 0,
        
        -- Metadata
        notes TEXT,
        last_login TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Indexes for fast lookups
    CREATE INDEX idx_agents_email ON support_agents(email);
    CREATE INDEX idx_agents_access_code ON support_agents(access_code);
    CREATE INDEX idx_agents_active ON support_agents(is_active);

    -- =====================================================
    -- 3. LIVE CHAT SESSIONS TABLE
    -- Simplified chat session tracking
    -- =====================================================

    CREATE TABLE live_chat_sessions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        
        -- User info (denormalized for performance)
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        user_email TEXT NOT NULL,
        user_name TEXT NOT NULL,
        
        -- Agent assignment
        agent_id UUID REFERENCES support_agents(id) ON DELETE SET NULL,
        
        -- Status: waiting, active, ended
        status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'ended')),
        
        -- Timestamps
        started_at TIMESTAMPTZ DEFAULT NOW(),
        assigned_at TIMESTAMPTZ,
        ended_at TIMESTAMPTZ,
        
        -- Rating & feedback
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        feedback TEXT,
        
        -- Metadata
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Indexes for performance
    CREATE INDEX idx_chat_sessions_user ON live_chat_sessions(user_id);
    CREATE INDEX idx_chat_sessions_agent ON live_chat_sessions(agent_id);
    CREATE INDEX idx_chat_sessions_status ON live_chat_sessions(status);
    CREATE INDEX idx_chat_sessions_started ON live_chat_sessions(started_at DESC);

    -- =====================================================
    -- 4. CHAT MESSAGES TABLE
    -- Messages within chat sessions
    -- =====================================================

    CREATE TABLE chat_messages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        session_id UUID REFERENCES live_chat_sessions(id) ON DELETE CASCADE,
        
        -- Sender info
        sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        is_agent BOOLEAN DEFAULT false,
        sender_role TEXT CHECK (sender_role IN ('user', 'agent', 'admin')),
        sender_name TEXT,
        
        -- Message content
        message TEXT NOT NULL,
        attachments JSONB DEFAULT '[]'::jsonb,
        
        -- Metadata
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Indexes
    CREATE INDEX idx_messages_session ON chat_messages(session_id);
    CREATE INDEX idx_messages_sender ON chat_messages(sender_id);
    CREATE INDEX idx_messages_created ON chat_messages(created_at DESC);
    CREATE INDEX idx_messages_unread ON chat_messages(is_read) WHERE is_read = false;

    -- =====================================================
    -- 5. AGENT ACTIVITY LOGS TABLE
    -- Track all agent actions for audit
    -- =====================================================

    CREATE TABLE agent_activity_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        agent_id UUID REFERENCES support_agents(id) ON DELETE CASCADE,
        
        -- Action type: login, logout, chat_assigned, user_viewed, subscription_extended, etc.
        action TEXT NOT NULL,
        
        -- Related entities
        user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        session_id UUID REFERENCES live_chat_sessions(id) ON DELETE SET NULL,
        
        -- Additional details
        details JSONB DEFAULT '{}'::jsonb,
        
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Indexes for filtering
    CREATE INDEX idx_activity_agent ON agent_activity_logs(agent_id);
    CREATE INDEX idx_activity_action ON agent_activity_logs(action);
    CREATE INDEX idx_activity_created ON agent_activity_logs(created_at DESC);
    CREATE INDEX idx_activity_user ON agent_activity_logs(user_id);

    -- =====================================================
    -- 6. AGENT USER NOTES TABLE
    -- Notes agents can add to user profiles
    -- =====================================================

    CREATE TABLE agent_user_notes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        agent_id UUID REFERENCES support_agents(id) ON DELETE CASCADE,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        
        note TEXT NOT NULL,
        is_important BOOLEAN DEFAULT false,
        
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Indexes
    CREATE INDEX idx_notes_user ON agent_user_notes(user_id);
    CREATE INDEX idx_notes_agent ON agent_user_notes(agent_id);
    CREATE INDEX idx_notes_important ON agent_user_notes(is_important);

    -- =====================================================
    -- 7. SUBSCRIPTION HISTORY TABLE
    -- Track subscription modifications by agents
    -- =====================================================

    CREATE TABLE subscription_history (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        agent_id UUID REFERENCES support_agents(id) ON DELETE SET NULL,
        
        -- Action type: extended, cancelled, modified
        action_type TEXT NOT NULL,
        
        -- Details
        days_added INTEGER,
        reason TEXT,
        old_end_date TIMESTAMPTZ,
        new_end_date TIMESTAMPTZ,
        
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Indexes
    CREATE INDEX idx_subscription_history_user ON subscription_history(user_id);
    CREATE INDEX idx_subscription_history_agent ON subscription_history(agent_id);
    CREATE INDEX idx_subscription_history_created ON subscription_history(created_at DESC);

    -- =====================================================
    -- 8. CANNED RESPONSES TABLE
    -- Pre-written responses for agents
    -- =====================================================

    CREATE TABLE canned_responses (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT,
        shortcut TEXT,
        
        is_active BOOLEAN DEFAULT true,
        usage_count INTEGER DEFAULT 0,
        
        created_by UUID REFERENCES support_agents(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Indexes
    CREATE INDEX idx_canned_active ON canned_responses(is_active);
    CREATE INDEX idx_canned_category ON canned_responses(category);

    -- =====================================================
    -- 9. HELPER FUNCTIONS
    -- =====================================================

    -- Function: Generate unique access code for agents
    CREATE OR REPLACE FUNCTION generate_access_code()
    RETURNS TEXT AS $$
    DECLARE
        code TEXT;
        exists BOOLEAN;
    BEGIN
        LOOP
            -- Generate 8-character random code
            code := upper(substr(md5(random()::text), 1, 8));
            
            -- Check if code already exists
            SELECT EXISTS(SELECT 1 FROM support_agents WHERE access_code = code) INTO exists;
            
            EXIT WHEN NOT exists;
        END LOOP;
        
        RETURN code;
    END;
    $$ LANGUAGE plpgsql;

    -- Function: Log agent activity
    CREATE OR REPLACE FUNCTION log_agent_activity(
        p_agent_id UUID,
        p_action TEXT,
        p_user_id UUID DEFAULT NULL,
        p_session_id UUID DEFAULT NULL,
        p_details JSONB DEFAULT '{}'::jsonb
    )
    RETURNS UUID AS $$
    DECLARE
        log_id UUID;
    BEGIN
        INSERT INTO agent_activity_logs (agent_id, action, user_id, session_id, details)
        VALUES (p_agent_id, p_action, p_user_id, p_session_id, p_details)
        RETURNING id INTO log_id;
        
        RETURN log_id;
    END;
    $$ LANGUAGE plpgsql;

    -- Function: Extend user subscription
    CREATE OR REPLACE FUNCTION extend_subscription(
        p_user_id UUID,
        p_agent_id UUID,
        p_days INTEGER,
        p_reason TEXT DEFAULT ''
    )
    RETURNS JSONB AS $$
    DECLARE
        current_end_date TIMESTAMPTZ;
        new_end_date TIMESTAMPTZ;
        current_status TEXT;
    BEGIN
        -- Get current subscription details
        SELECT subscription_end_date, subscription_status 
        INTO current_end_date, current_status
        FROM profiles 
        WHERE id = p_user_id;
        
        IF NOT FOUND THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'User not found'
            );
        END IF;
        
        -- Calculate new end date
        IF current_end_date IS NULL OR current_end_date < NOW() THEN
            new_end_date := NOW() + (p_days || ' days')::INTERVAL;
        ELSE
            new_end_date := current_end_date + (p_days || ' days')::INTERVAL;
        END IF;
        
        -- Update subscription
        UPDATE profiles 
        SET 
            subscription_end_date = new_end_date,
            subscription_status = 'active',
            updated_at = NOW()
        WHERE id = p_user_id;
        
        -- Log in subscription history
        INSERT INTO subscription_history (
            user_id, agent_id, action_type, days_added, reason, 
            old_end_date, new_end_date
        ) VALUES (
            p_user_id, p_agent_id, 'extended', p_days, p_reason,
            current_end_date, new_end_date
        );
        
        -- Log agent activity
        PERFORM log_agent_activity(
            p_agent_id,
            'subscription_extended',
            p_user_id,
            NULL,
            jsonb_build_object(
                'days_added', p_days,
                'old_end_date', current_end_date,
                'new_end_date', new_end_date,
                'reason', p_reason
            )
        );
        
        RETURN jsonb_build_object(
            'success', true,
            'message', format('Subscription extended by %s days', p_days),
            'new_end_date', new_end_date
        );
    END;
    $$ LANGUAGE plpgsql;

    -- Function: Cancel user subscription (Super admin only)
    CREATE OR REPLACE FUNCTION cancel_subscription(
        p_user_id UUID,
        p_agent_id UUID,
        p_reason TEXT DEFAULT ''
    )
    RETURNS JSONB AS $$
    DECLARE
        current_end_date TIMESTAMPTZ;
    BEGIN
        -- Get current end date
        SELECT subscription_end_date INTO current_end_date
        FROM profiles 
        WHERE id = p_user_id;
        
        IF NOT FOUND THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'User not found'
            );
        END IF;
        
        -- Update subscription
        UPDATE profiles 
        SET 
            subscription_status = 'cancelled',
            updated_at = NOW()
        WHERE id = p_user_id;
        
        -- Log in subscription history
        INSERT INTO subscription_history (
            user_id, agent_id, action_type, reason, old_end_date
        ) VALUES (
            p_user_id, p_agent_id, 'cancelled', p_reason, current_end_date
        );
        
        -- Log agent activity
        PERFORM log_agent_activity(
            p_agent_id,
            'subscription_cancelled',
            p_user_id,
            NULL,
            jsonb_build_object(
                'reason', p_reason,
                'end_date', current_end_date
            )
        );
        
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Subscription cancelled'
        );
    END;
    $$ LANGUAGE plpgsql;

    -- Function: Increment agent chat count
    CREATE OR REPLACE FUNCTION increment_agent_chats()
    RETURNS TRIGGER AS $$
    BEGIN
        IF NEW.agent_id IS NOT NULL AND (OLD.agent_id IS NULL OR OLD.agent_id != NEW.agent_id) THEN
            UPDATE support_agents 
            SET total_chats_handled = total_chats_handled + 1
            WHERE id = NEW.agent_id;
        END IF;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- Trigger: Auto-increment agent chat count when assigned
    CREATE TRIGGER increment_agent_chats_trigger
        AFTER UPDATE ON live_chat_sessions
        FOR EACH ROW
        EXECUTE FUNCTION increment_agent_chats();

    -- Function: Auto-update updated_at timestamp
    CREATE OR REPLACE FUNCTION update_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- Triggers for updated_at
    CREATE TRIGGER update_agents_updated_at
        BEFORE UPDATE ON support_agents
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at();

    CREATE TRIGGER update_sessions_updated_at
        BEFORE UPDATE ON live_chat_sessions
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at();

    CREATE TRIGGER update_notes_updated_at
        BEFORE UPDATE ON agent_user_notes
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at();

    CREATE TRIGGER update_canned_updated_at
        BEFORE UPDATE ON canned_responses
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at();

    -- =====================================================
    -- 10. ROW LEVEL SECURITY (RLS)
    -- Temporarily disabled for testing - enable after verification
    -- =====================================================

    -- Disable RLS for now (enable and configure policies later)
    ALTER TABLE support_agents DISABLE ROW LEVEL SECURITY;
    ALTER TABLE live_chat_sessions DISABLE ROW LEVEL SECURITY;
    ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;
    ALTER TABLE agent_activity_logs DISABLE ROW LEVEL SECURITY;
    ALTER TABLE agent_user_notes DISABLE ROW LEVEL SECURITY;
    ALTER TABLE subscription_history DISABLE ROW LEVEL SECURITY;
    ALTER TABLE canned_responses DISABLE ROW LEVEL SECURITY;

    -- =====================================================
    -- 11. SEED DATA (Optional canned responses)
    -- =====================================================

    INSERT INTO canned_responses (title, content, category, shortcut, is_active) VALUES
    ('Welcome Message', 'Hello! Thank you for contacting Durrah Exams support. How can I help you today?', 'greetings', '/welcome', true),
    ('Technical Issue', 'I understand you''re experiencing technical difficulties. Can you please provide more details about the issue?', 'support', '/tech', true),
    ('Payment Issue', 'I see you have a payment-related question. Let me check your account details.', 'payment', '/payment', true),
    ('Subscription Info', 'Your current subscription status is active. Would you like to know more about your plan?', 'subscription', '/sub', true),
    ('Closing Message', 'Thank you for contacting us! If you have any other questions, feel free to reach out. Have a great day!', 'closing', '/bye', true);

    -- =====================================================
    -- 12. VERIFICATION QUERIES
    -- Run these to verify the migration worked
    -- =====================================================

    -- Check all tables exist
    SELECT 
        table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
        AND table_name IN (
            'support_agents',
            'live_chat_sessions',
            'chat_messages',
            'agent_activity_logs',
            'agent_user_notes',
            'subscription_history',
            'canned_responses'
        )
    ORDER BY table_name;

    -- Check all functions exist
    SELECT 
        routine_name 
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
        AND routine_name IN (
            'generate_access_code',
            'log_agent_activity',
            'extend_subscription',
            'cancel_subscription'
        )
    ORDER BY routine_name;

    -- =====================================================
    -- MIGRATION COMPLETE!
    -- =====================================================
    -- Next steps:
    -- 1. Create a super admin agent manually or via SQL
    -- 2. Test the SuperAdminPanel by logging in
    -- 3. Create test agents and assign them to chats
    -- 4. Test all CRUD operations
    -- 5. Enable RLS policies once everything works
    -- =====================================================
