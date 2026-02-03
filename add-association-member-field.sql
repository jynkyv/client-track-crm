
-- Add is_association_member column to companies table
ALTER TABLE companies 
ADD COLUMN is_association_member BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN companies.is_association_member IS 'Whether the company is a member of the association';
