-- Add is_test column to payments table for test payment tracking
ALTER TABLE payments ADD COLUMN is_test BOOLEAN DEFAULT FALSE;

-- Create index for easy filtering of test payments
CREATE INDEX idx_payments_is_test ON payments(is_test);

-- Comment for clarity
COMMENT ON COLUMN payments.is_test IS 'Marks payment records created for testing purposes (payment-test page)';
