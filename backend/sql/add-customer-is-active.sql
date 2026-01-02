-- Add is_active column to customers table
-- This column is used to track whether a customer is active or inactive

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Set all existing customers to active
UPDATE customers
SET is_active = TRUE
WHERE is_active IS NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_customers_is_active ON customers(is_active);

-- Add comment
COMMENT ON COLUMN customers.is_active IS 'Indicates whether the customer is active (true) or inactive (false)';
