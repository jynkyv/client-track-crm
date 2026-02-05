-- Drop the existing check constraint for visa_status if it exists
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_visa_status_check;

-- Add the new check constraint including 'processing'
ALTER TABLE customers ADD CONSTRAINT customers_visa_status_check 
CHECK (visa_status IN ('pending', 'processing', 'completed'));

-- Add a comment to the column for clarity
COMMENT ON COLUMN customers.visa_status IS 'Visa status: pending (待办), processing (办理中), completed (已完成)';
