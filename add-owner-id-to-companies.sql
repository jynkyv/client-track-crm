-- Add owner_id to companies table
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_companies_owner_id ON companies(owner_id);

-- Add comment
COMMENT ON COLUMN companies.owner_id IS '负责人ID（创建者），外键关联到 auth.users';
