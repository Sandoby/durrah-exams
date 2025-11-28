-- Create coupon_usage table to track which users have used which coupons
CREATE TABLE IF NOT EXISTS public.coupon_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coupon_id UUID REFERENCES public.coupons(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(coupon_id, user_id) -- Ensure each user can only use a coupon once
);

-- Enable RLS
ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for coupon_usage
-- Users can view their own coupon usage
CREATE POLICY "Users can view own coupon usage" ON public.coupon_usage
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own coupon usage (system will handle this)
CREATE POLICY "Users can insert own coupon usage" ON public.coupon_usage
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_coupon_usage_user_id ON public.coupon_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon_id ON public.coupon_usage(coupon_id);
