-- Fix company ownership after username change
-- This script adds owner_name column and should be run in Supabase SQL Editor

-- 1. Add owner_name column to companies table
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS owner_name VARCHAR(100);

-- Add comment
COMMENT ON COLUMN companies.owner_name IS '负责人姓名（冗余字段，便于查询显示）';

-- 2. Fix foreign key constraint: change from auth.users to public.users
-- First drop the existing constraint
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_owner_id_fkey;

-- Recreate the foreign key to reference public.users table
ALTER TABLE companies 
ADD CONSTRAINT companies_owner_id_fkey 
FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;

-- 3. Backfill owner_name from users table for companies that have owner_id set
UPDATE companies c
SET owner_name = u.username
FROM users u
WHERE c.owner_id = u.id AND c.owner_name IS NULL;

-- 4. Batch update all companies with NULL owner_id to assign to user ハシミ
UPDATE companies 
SET 
  owner_id = '84fa3607-567a-4c77-9e56-aaaa60f91915',
  owner_name = 'ハシミ'
WHERE owner_id IS NULL;

-- 5. Verify the update
SELECT id, name, owner_id, owner_name FROM companies;
