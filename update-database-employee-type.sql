-- 数据库更新脚本 - 添加国家字段
-- 请在Supabase控制台的SQL编辑器中执行以下SQL

-- ============================================
-- 更新users表，添加国家字段
-- ============================================

-- 1. 添加国家字段
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS country VARCHAR(50);

-- 2. 为现有员工设置默认值（如果已有数据）
-- 将所有现有员工的国家设置为中国
UPDATE users 
SET country = '中国'
WHERE country IS NULL;

-- 3. 创建索引
CREATE INDEX IF NOT EXISTS idx_users_country ON users(country);

-- ============================================
-- 验证表结构
-- ============================================

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
AND column_name = 'country'
ORDER BY column_name;

