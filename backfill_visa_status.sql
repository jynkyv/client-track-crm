-- Update existing customers who are in 'Training' stage to have 'pending' visa status
-- Only updates records where visa_status is currently NULL to avoid overwriting existing data

UPDATE customers
SET visa_status = 'pending'
WHERE stage2_status = '培训中' 
  AND visa_status IS NULL;
