-- Remove gmo_contract column
ALTER TABLE companies DROP COLUMN IF EXISTS gmo_contract;

-- Add technical_intern_training_program_agreement column (Array of JSON objects for files)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS technical_intern_training_program_agreement JSONB DEFAULT '[]'::JSONB;

-- Add application_sent_at column to track when the application email was sent
ALTER TABLE companies ADD COLUMN IF NOT EXISTS application_sent_at TIMESTAMP WITH TIME ZONE;
