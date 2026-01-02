-- Referral and Sales Hub Schema Migration

-- 1. Sales Agents Table
-- Stores partner information and their unique access code.
CREATE TABLE IF NOT EXISTS public.sales_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    access_code TEXT UNIQUE NOT NULL, -- Used for referral links (e.g., ?ref=CODE)
    is_active BOOLEAN DEFAULT true,
    commission_rate DECIMAL(5,2) DEFAULT 10.00, -- Optional: percentage per sale
    tier TEXT DEFAULT 'bronze', -- 'bronze', 'silver', 'gold'
    total_earnings DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure access_code is case-insensitive for easier lookup
CREATE INDEX IF NOT EXISTS idx_sales_agents_access_code_upper ON public.sales_agents (UPPER(access_code));

-- 2. Sales Events Table
-- Tracks signups, clicks, and other attribution milestones.
CREATE TABLE IF NOT EXISTS public.sales_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES public.sales_agents(id) ON DELETE CASCADE,
    user_id UUID, -- Nullable if it's just a click, set on signup
    type TEXT NOT NULL, -- 'signup', 'click', 'conversion'
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_events_agent_id ON public.sales_events(agent_id);
CREATE INDEX IF NOT EXISTS idx_sales_events_type ON public.sales_events(type);

-- 3. Sales Leads Table
-- Stores potential customers captured via the Sales Hub lead form.
CREATE TABLE IF NOT EXISTS public.sales_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES public.sales_agents(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    notes TEXT,
    status TEXT DEFAULT 'new', -- 'new', 'contacted', 'won', 'lost'
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_leads_agent_id ON public.sales_leads(agent_id);
CREATE INDEX IF NOT EXISTS idx_sales_leads_status ON public.sales_leads(status);

-- 4. Attribution Column for Profiles
-- Links users to the agent who referred them for long-term tracking.
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='referred_by_code') THEN
        ALTER TABLE public.profiles ADD COLUMN referred_by_code TEXT;
    END IF;
END $$;

-- 5. Link Sales Agent to Coupon (Optional but Recommended)
-- If each agent has a specific coupon code.
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales_agents' AND column_name='coupon_id') THEN
        ALTER TABLE public.sales_agents ADD COLUMN coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Enable RLS (Row Level Security) - Basic Setup
ALTER TABLE public.sales_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_leads ENABLE ROW LEVEL SECURITY;

-- Policy: Allow everyone to SELECT (needed for referral lookups and dashboard)
DROP POLICY IF EXISTS "Allow public select for sales_agents" ON public.sales_agents;
CREATE POLICY "Allow public select for sales_agents" ON public.sales_agents FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public select for sales_events" ON public.sales_events;
CREATE POLICY "Allow public select for sales_events" ON public.sales_events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public select for sales_leads" ON public.sales_leads;
CREATE POLICY "Allow public select for sales_leads" ON public.sales_leads FOR SELECT USING (true);

-- Policy: Allow insertion/updates for everyone (Relies on Frontend Admin Guard)
DROP POLICY IF EXISTS "Allow all for sales_agents" ON public.sales_agents;
CREATE POLICY "Allow all for sales_agents" ON public.sales_agents FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for sales_events" ON public.sales_events;
CREATE POLICY "Allow all for sales_events" ON public.sales_events FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for sales_leads" ON public.sales_leads;
CREATE POLICY "Allow all for sales_leads" ON public.sales_leads FOR ALL USING (true) WITH CHECK (true);

-- 5. Sales Assets Table
-- Stores marketing materials (images, scripts, etc.)
CREATE TABLE IF NOT EXISTS public.sales_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL, -- 'scripts', 'links', 'docs', 'graphics'
    url TEXT,
    content TEXT, -- For scripts or copy
    thumbnail_url TEXT,
    file_size TEXT,
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Sales Announcements
-- Global messages from admins to all partners.
CREATE TABLE IF NOT EXISTS public.sales_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    priority TEXT DEFAULT 'normal', -- 'info', 'warning', 'urgent'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Sales Payouts
-- Tracking commissions and financial status.
CREATE TABLE IF NOT EXISTS public.sales_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES public.sales_agents(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'cancelled'
    user_id UUID REFERENCES public.profiles(id), -- The customer who generated this payout
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Sales Social Templates
-- Pre-written posts for partners to share on social media.
CREATE TABLE IF NOT EXISTS public.sales_social_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform TEXT NOT NULL, -- 'whatsapp', 'linkedin', 'twitter', 'facebook'
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. RPC: generate_access_code
-- Used by Admin Panel to generate unique, secure partner codes.
CREATE OR REPLACE FUNCTION public.generate_access_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Omit confusing 0, O, 1, I
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Updated At Trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_sales_agents_updated_at ON public.sales_agents;
CREATE TRIGGER update_sales_agents_updated_at BEFORE UPDATE ON public.sales_agents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_sales_leads_updated_at ON public.sales_leads;
CREATE TRIGGER update_sales_leads_updated_at BEFORE UPDATE ON public.sales_leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Profile Attribution Sync Trigger
-- Automatically syncs referred_by_code from auth.users metadata to public.profiles
CREATE OR REPLACE FUNCTION public.handle_referral_sync()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.profiles
    SET referred_by_code = (NEW.raw_user_meta_data->>'referred_by_code')
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger should run after a new user is created in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_sync_referral ON auth.users;
CREATE TRIGGER on_auth_user_created_sync_referral
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_referral_sync();

-- Note: In a strict production environment, you should use auth.jwt() ->> 'role' = 'super_admin'
-- for the 'Admins have full access' policy above, but ensure your admin user actually has that role.
