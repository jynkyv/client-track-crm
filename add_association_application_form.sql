ALTER TABLE companies
ADD COLUMN association_application_form jsonb[] DEFAULT NULL;
