-- Update companies that have active trainees OR potential trainees (Interview Passed, etc)
-- Broadening the check to include '面试通过' and '已完成'

UPDATE companies c
SET first_training_at = NOW()
WHERE c.first_training_at IS NULL
  AND EXISTS (
    SELECT 1
    FROM customers cust
    WHERE cust.company_id = c.id
      AND cust.stage2_status IN ('面试通过', '培训中', '已完成')
  );
