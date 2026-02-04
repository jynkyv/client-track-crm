-- 清理不符合新标准的行业数据 (仅保留日语标准名称)
-- 将不在此列表中的行业字段置为 NULL

UPDATE companies
SET industry = NULL
WHERE industry NOT IN (
  '農業・林業関係',
  '漁業関係',
  '建設関係',
  '食品製造関係',
  '繊維・衣服関係',
  '機械・金属関係'
);

-- 验证清理结果
SELECT id, name, industry FROM companies;
