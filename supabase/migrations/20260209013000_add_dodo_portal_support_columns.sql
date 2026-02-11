-- Add missing columns required by Dodo portal/recovery flows.
-- This migration is idempotent and safe to run multiple times.

-- Profiles: persist Dodo customer mapping for deterministic portal access.
ALTER TABLE IF EXISTS public.profiles
ADD COLUMN IF NOT EXISTS dodo_customer_id text;

-- Payments: keep optional payer email for fallback linking/debugging.
ALTER TABLE IF EXISTS public.payments
ADD COLUMN IF NOT EXISTS user_email text;

-- Payments: keep optional provider payload metadata (e.g. subscriptionId).
ALTER TABLE IF EXISTS public.payments
ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Helpful indexes for portal/customer resolution and Dodo payment lookups.
CREATE INDEX IF NOT EXISTS idx_profiles_dodo_customer_id
ON public.profiles (dodo_customer_id);

CREATE INDEX IF NOT EXISTS idx_payments_user_id_created_at
ON public.payments (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_user_email_created_at
ON public.payments (user_email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_merchant_reference
ON public.payments (merchant_reference);
