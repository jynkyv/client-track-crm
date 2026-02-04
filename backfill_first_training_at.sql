-- Update companies that have active trainees OR active visa status
-- Broadening the check to include visa_status IS NOT NULL

UPDATE companies c
SET first_training_at = NOW()
WHERE c.first_training_at IS NULL
  AND EXISTS (
    SELECT 1
    FROM customers cust
    WHERE cust.company_id = c.id
      AND (
        cust.stage2_status IN ('面试通过', '培训中', '已完成')
        OR cust.visa_status IS NOT NULL
      )
  );
