-- Migration to split 'processing' visa_status into 4 detailed states

-- 1. Migrate existing data
-- Map 'processing' to the first stage 'otit_preparing'
UPDATE customers
SET visa_status = 'otit_preparing'
WHERE visa_status = 'processing';

-- 2. Update check constraint if it exists
-- (Supabase/Postgres check constraints usually need to be dropped and recreated if they enumerate values)
-- However, if it's just a text column without a check constraint, this is fine.
-- Let's attempt to drop the constraint if it exists and add a new one to ensure data integrity.

DO $$
BEGIN
    -- Try to drop constraint if it exists (naming convention varies, so we might need to check information_schema or just run it blindly if we knew the name)
    -- Assuming common naming convention or no constraint. 
    -- If there is a constraint named 'customers_visa_status_check', drop it.
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customers_visa_status_check') THEN
        ALTER TABLE customers DROP CONSTRAINT customers_visa_status_check;
    END IF;
END $$;

-- 3. Add new check constraint
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
