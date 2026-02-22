-- Add subscription_status CHECK constraint after data cleanup
-- This runs after fixing any invalid status values

DO $$ BEGIN
    ALTER TABLE profiles ADD CONSTRAINT chk_subscription_status
    CHECK (subscription_status IS NULL OR subscription_status IN ('active', 'cancelled', 'expired', 'payment_failed', 'trialing'));
EXCEPTION 
    WHEN duplicate_object THEN NULL;
END $$;
