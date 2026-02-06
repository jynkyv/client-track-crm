-- Refactor Visa Status: 3 states -> 6 states

-- 1. Drop the existing check constraint explicitly
-- The error "violates check constraint customers_visa_status_check" confirms this is the name.
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_visa_status_check;

-- 2. Update existing 'processing' status to 'otit_preparing'
-- We must do this AFTER dropping the constraint because 'otit_preparing' is not valid under the old constraint.
UPDATE customers 
SET visa_status = 'otit_preparing' 
WHERE visa_status = 'processing';

-- 3. Add the new check constraint with all 6 states
ALTER TABLE customers 
ADD CONSTRAINT customers_visa_status_check 
CHECK (visa_status IN (
  'pending', 
  'otit_preparing', 
  'otit_submitted', 
  'visa_preparing', 
  'visa_submitted', 
  'completed'
));

-- 4. Verify the update (Optional)
-- SELECT visa_status, count(*) FROM customers GROUP BY visa_status;
