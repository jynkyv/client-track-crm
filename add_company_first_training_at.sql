-- Add first_training_at column to companies table
ALTER TABLE companies
ADD COLUMN first_training_at timestamptz DEFAULT NULL;

-- Comment on column
COMMENT ON COLUMN companies.first_training_at IS 'Time when the first trainee (customer with status=training) was added/converted for this company';
