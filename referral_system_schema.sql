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

-- 5. Sales Assets Table
-- Stores marketing materials (images, scripts, etc.)
CREATE TABLE IF NOT EXISTS public.sales_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL, -- 'images', 'scripts', 'docs'
    url TEXT,
    content TEXT, -- For scripts or copy
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

CREATE TRIGGER update_sales_agents_updated_at BEFORE UPDATE ON public.sales_agents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sales_leads_updated_at BEFORE UPDATE ON public.sales_leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Policy: Admins can see everything
CREATE POLICY "Admins have full access to sales data" 
ON public.sales_agents 
FOR ALL 
USING (auth.jwt() ->> 'role' = 'super_admin');

-- Note: Agents verify via access_code in the UI, but database-level 
-- isolation can be added if they login via auth.users.
