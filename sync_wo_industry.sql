-- Sync work_orders industry with their associated company's industry
UPDATE work_orders as wo
SET industry = c.industry
FROM companies as c
WHERE wo.company_id = c.id;

-- Verify
SELECT wo.id, wo.industry as wo_industry, c.industry as company_industry
FROM work_orders wo
JOIN companies c ON wo.company_id = c.id
LIMIT 10;
