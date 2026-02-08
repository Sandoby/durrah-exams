-- Professional OTP-Based Password Reset System - Database Schema
-- Email-Only Version (No SMS fields)
-- Created: 2026-02-08

-- ============================================================================
-- Table 1: password_reset_otps - Core OTP storage
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.password_reset_otps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    verified BOOLEAN DEFAULT false,
    verification_attempts INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    verified_at TIMESTAMPTZ,
    ip_address TEXT
);

-- Indexes for performance
CREATE INDEX idx_otp_email_active ON public.password_reset_otps(email, expires_at) WHERE NOT verified;
CREATE INDEX idx_otp_expires ON public.password_reset_otps(expires_at);

COMMENT ON TABLE public.password_reset_otps IS 'Stores OTP codes for password reset with 15-minute expiry';
COMMENT ON COLUMN public.password_reset_otps.otp_code IS '6-digit numeric OTP code';
COMMENT ON COLUMN public.password_reset_otps.verification_attempts IS 'Locks after 3 failed attempts';

-- ============================================================================
-- Table 2: password_reset_rate_limits - Prevent abuse
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.password_reset_rate_limits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    identifier TEXT NOT NULL, -- email or IP address
    identifier_type TEXT NOT NULL CHECK (identifier_type IN ('email', 'ip')),
    request_count INT DEFAULT 1,
    window_start TIMESTAMPTZ DEFAULT now(),
    last_request_at TIMESTAMPTZ DEFAULT now()
);

-- Unique index to enforce one rate limit record per identifier+type
CREATE UNIQUE INDEX idx_rate_limit_identifier ON public.password_reset_rate_limits(identifier, identifier_type);

COMMENT ON TABLE public.password_reset_rate_limits IS 'Rate limiting: 5 requests/hour per email, 10/hour per IP';

-- ============================================================================
-- Table 3: password_reset_tokens - Secure reset tokens after OTP verification
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    reset_token TEXT NOT NULL UNIQUE,
    otp_id UUID REFERENCES public.password_reset_otps(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    used_at TIMESTAMPTZ
);

-- Indexes for token lookup
CREATE INDEX idx_reset_token ON public.password_reset_tokens(reset_token) WHERE NOT used;
CREATE INDEX idx_reset_email ON public.password_reset_tokens(email);

COMMENT ON TABLE public.password_reset_tokens IS 'Secure tokens generated after successful OTP verification (30-min expiry)';

-- ============================================================================
-- Table 4: password_reset_audit_log - Security audit trail
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.password_reset_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    event_type TEXT NOT NULL, -- 'otp_requested', 'otp_verified', 'otp_failed', 'password_reset'
    ip_address TEXT,
    user_agent TEXT,
    success BOOLEAN,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for audit queries
CREATE INDEX idx_audit_email ON public.password_reset_audit_log(email);
CREATE INDEX idx_audit_created ON public.password_reset_audit_log(created_at);
CREATE INDEX idx_audit_event_type ON public.password_reset_audit_log(event_type);

COMMENT ON TABLE public.password_reset_audit_log IS 'Comprehensive audit log for all password reset events';

-- ============================================================================
-- Row-Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.password_reset_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_audit_log ENABLE ROW LEVEL SECURITY;

-- Service role bypasses all RLS (Edge Functions use service role)
-- No user-facing SELECT policies needed (all operations via Edge Functions)

COMMENT ON TABLE public.password_reset_otps IS 'RLS enabled - access via Edge Functions only';

-- ============================================================================
-- Automatic Cleanup Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_password_resets()
RETURNS void AS $$
BEGIN
    -- Delete expired OTPs (older than 24 hours)
    DELETE FROM public.password_reset_otps
    WHERE expires_at < now() - INTERVAL '24 hours';

    -- Delete used/expired reset tokens (older than 48 hours)
    DELETE FROM public.password_reset_tokens
    WHERE (used = true OR expires_at < now())
    AND created_at < now() - INTERVAL '48 hours';

    -- Clean rate limit records older than 2 hours
    DELETE FROM public.password_reset_rate_limits
    WHERE window_start < now() - INTERVAL '2 hours';

    -- Optional: Clean old audit logs (keep 90 days)
    DELETE FROM public.password_reset_audit_log
    WHERE created_at < now() - INTERVAL '90 days';

    RAISE NOTICE 'Expired password reset data cleaned up successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.cleanup_expired_password_resets IS 'Cleans up expired OTPs, tokens, rate limits, and old audit logs';

-- ============================================================================
-- Schedule Cleanup (requires pg_cron extension)
-- ============================================================================

-- Note: Uncomment the line below if pg_cron extension is enabled
-- This will run the cleanup function every hour
-- SELECT cron.schedule('cleanup-password-resets', '0 * * * *', 'SELECT public.cleanup_expired_password_resets()');

-- Manual cleanup can be run with:
-- SELECT public.cleanup_expired_password_resets();

-- ============================================================================
-- Helpful Queries for Monitoring
-- ============================================================================

-- View active OTPs
-- SELECT email, otp_code, expires_at, verification_attempts, created_at
-- FROM password_reset_otps
-- WHERE NOT verified AND expires_at > now()
-- ORDER BY created_at DESC;

-- View rate limit status
-- SELECT identifier, identifier_type, request_count, window_start
-- FROM password_reset_rate_limits
-- ORDER BY last_request_at DESC;

-- View recent audit events
-- SELECT email, event_type, success, created_at
-- FROM password_reset_audit_log
-- ORDER BY created_at DESC
-- LIMIT 50;

-- Check OTP success rate (last 7 days)
-- SELECT
--   DATE_TRUNC('day', created_at) as date,
--   COUNT(*) as total_otps,
--   COUNT(*) FILTER (WHERE verified = true) as verified,
--   ROUND(COUNT(*) FILTER (WHERE verified = true) * 100.0 / COUNT(*), 2) as success_rate
-- FROM password_reset_otps
-- WHERE created_at > now() - INTERVAL '7 days'
-- GROUP BY date
-- ORDER BY date DESC;
