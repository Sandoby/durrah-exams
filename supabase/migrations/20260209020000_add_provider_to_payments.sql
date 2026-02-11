-- Add provider column expected by payment/webhook flows.
ALTER TABLE IF EXISTS public.payments
ADD COLUMN IF NOT EXISTS provider text;

CREATE INDEX IF NOT EXISTS idx_payments_provider_created_at
ON public.payments (provider, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_provider_merchant_reference
ON public.payments (provider, merchant_reference);

