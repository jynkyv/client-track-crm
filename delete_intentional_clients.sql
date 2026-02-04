-- SQL script to delete all 'Intentional Clients' (status != 'closed')
-- Run this in your Supabase SQL Editor

DELETE FROM customers
WHERE status != 'closed';

-- Verify deletion
SELECT count(*) FROM customers WHERE status != 'closed';
