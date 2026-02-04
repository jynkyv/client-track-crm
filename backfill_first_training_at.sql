-- Update companies that have active trainees but no first_training_at
-- Set it to CURRENT_TIMESTAMP (or a specific fixed time if requested, user said "current Beijing time")

UPDATE companies c
SET first_training_at = NOW()
WHERE c.first_training_at IS NULL
  AND EXISTS (
    SELECT 1
    FROM customers cust
    WHERE cust.company_id = c.id
      AND cust.stage2_status = '培训中' -- Assuming '培训中' is the status value for Training
  );
