-- Add industry column to work_orders table
ALTER TABLE work_orders
ADD COLUMN industry text;

-- Optional: If you want to migrate existing 'name' data to 'industry' (only if they match valid industries)
-- UPDATE work_orders SET industry = name WHERE name IN ('農業・林業関係', ...);

-- Verify
SELECT id, name, industry FROM work_orders LIMIT 5;
