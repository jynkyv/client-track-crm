-- Reset application_sent_at to NULL for all companies
UPDATE companies SET application_sent_at = NULL;
