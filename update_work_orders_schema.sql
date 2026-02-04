-- Add industry column and drop name column from work_orders table
-- Note: Make sure to run this AFTER you have migrated any necessary data, as dropping 'name' is destructive.

-- 1. Add industry column
ALTER TABLE work_orders
ADD COLUMN industry text;

-- 2. Drop name column
ALTER TABLE work_orders
DROP COLUMN name;

-- Verify
SELECT * FROM work_orders LIMIT 5;
