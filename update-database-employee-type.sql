-- 数据库更新脚本 - 添加员工身份和国家字段
-- 请在Supabase控制台的SQL编辑器中执行以下SQL

-- ============================================
-- 更新users表，添加员工身份和国家字段
-- ============================================

-- 1. 添加员工身份字段（中方员工/日方员工）
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS employee_type VARCHAR(20) CHECK (employee_type IN ('chinese_employee', 'japanese_employee'));

-- 2. 添加国家字段
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS country VARCHAR(50);

-- 3. 为现有员工设置默认值（如果已有数据）
-- 注意：根据实际情况调整，这里假设现有员工都是中方员工
UPDATE users 
SET employee_type = 'chinese_employee', country = '中国'
WHERE employee_type IS NULL AND role = 'employee';

-- 4. 为管理员设置默认值（管理员可以访问所有功能，不需要设置employee_type）
UPDATE users 
SET country = '中国'
WHERE country IS NULL AND role = 'admin';

-- 5. 创建索引
CREATE INDEX IF NOT EXISTS idx_users_employee_type ON users(employee_type);
CREATE INDEX IF NOT EXISTS idx_users_country ON users(country);

-- ============================================
-- 验证表结构
-- ============================================

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
AND column_name IN ('employee_type', 'country')
ORDER BY column_name;

