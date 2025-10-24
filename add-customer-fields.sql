-- 为客户表添加新字段
-- 请在Supabase控制台的SQL编辑器中执行以下SQL

-- 添加工作经验字段
ALTER TABLE customers ADD COLUMN IF NOT EXISTS work_experience TEXT;

-- 添加年龄字段
ALTER TABLE customers ADD COLUMN IF NOT EXISTS age INTEGER;

-- 添加性别字段
ALTER TABLE customers ADD COLUMN IF NOT EXISTS gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other'));

-- 添加备注字段
ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes TEXT;

-- 验证字段是否添加成功
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'customers' 
AND table_schema = 'public'
ORDER BY ordinal_position;
