-- 在 companies 表中添加实习地址字段
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS intern_address TEXT;

-- 添加注释
COMMENT ON COLUMN companies.intern_address IS '实习地址';
