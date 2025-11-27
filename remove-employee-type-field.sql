-- 移除employee_type字段的SQL脚本
-- 请在Supabase控制台的SQL编辑器中执行以下SQL
-- 注意：如果之前已经执行过添加employee_type字段的SQL，需要执行此脚本来移除该字段

-- ============================================
-- 移除employee_type字段
-- ============================================

-- 1. 删除employee_type字段的索引（如果存在）
DROP INDEX IF EXISTS idx_users_employee_type;

-- 2. 删除employee_type字段
ALTER TABLE users 
DROP COLUMN IF EXISTS employee_type;

-- ============================================
-- 验证表结构
-- ============================================

-- 验证employee_type字段是否已删除
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
AND column_name = 'employee_type';

-- 如果上面的查询没有返回任何结果，说明employee_type字段已成功删除

-- 验证当前users表的所有字段
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

