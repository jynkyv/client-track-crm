-- 工单系统重构迁移脚本
-- 将任务中心系统重构为工单管理系统
-- 执行日期: 2025-12-02
-- 
-- 主要变更:
-- 1. 扩展 work_orders 表，添加负责人字段
-- 2. 修改 applicants 表，添加负责人字段
-- 3. 删除 tasks 表
-- 4. 更新 RLS 权限策略

-- ============================================
-- 第一部分：扩展 work_orders 表
-- ============================================

-- 添加负责人字段
ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS owner_name VARCHAR(100);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_work_orders_owner_id ON work_orders(owner_id);

-- 添加注释
COMMENT ON COLUMN work_orders.owner_id IS '负责人ID（创建者），外键关联到 auth.users';
COMMENT ON COLUMN work_orders.owner_name IS '负责人姓名（冗余字段，便于查询显示）';

-- ============================================
-- 第二部分：修改 applicants 表
-- ============================================

-- 添加负责人字段
ALTER TABLE applicants 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS owner_name VARCHAR(100);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_applicants_owner_id ON applicants(owner_id);

-- 添加注释
COMMENT ON COLUMN applicants.owner_id IS '负责人ID（创建者），外键关联到 auth.users';
COMMENT ON COLUMN applicants.owner_name IS '负责人姓名（冗余字段，便于查询显示）';

-- 修改 manager_name 字段的注释，保持兼容性
COMMENT ON COLUMN applicants.manager_name IS '负责人姓名（已废弃，使用 owner_name 代替）';

-- ============================================
-- 第三部分：删除 tasks 表
-- ============================================

-- 删除 tasks 表（如果存在）
DROP TABLE IF EXISTS tasks CASCADE;

-- ============================================
-- 第四部分：更新 RLS 权限策略
-- ============================================

-- 启用 RLS
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE applicants ENABLE ROW LEVEL SECURITY;

-- 删除旧的策略（如果存在）
DROP POLICY IF EXISTS "work_orders_select_policy" ON work_orders;
DROP POLICY IF EXISTS "work_orders_insert_policy" ON work_orders;
DROP POLICY IF EXISTS "work_orders_update_policy" ON work_orders;
DROP POLICY IF EXISTS "work_orders_delete_policy" ON work_orders;

DROP POLICY IF EXISTS "applicants_select_policy" ON applicants;
DROP POLICY IF EXISTS "applicants_insert_policy" ON applicants;
DROP POLICY IF EXISTS "applicants_update_policy" ON applicants;
DROP POLICY IF EXISTS "applicants_delete_policy" ON applicants;

-- ============================================
-- work_orders 表的 RLS 策略
-- ============================================

-- SELECT策略：中方员工可查看所有，日方员工只能查看自己创建的
CREATE POLICY "work_orders_select_policy" ON work_orders
FOR SELECT
USING (
  auth.uid() IN (
    SELECT id FROM users WHERE role = 'admin'
  )
  OR
  auth.uid() IN (
    SELECT id FROM users WHERE country = '中国'
  )
  OR
  (
    auth.uid() IN (
      SELECT id FROM users WHERE country = '日本'
    )
    AND owner_id = auth.uid()
  )
);

-- INSERT策略：所有认证用户都可以创建工单
CREATE POLICY "work_orders_insert_policy" ON work_orders
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
);

-- UPDATE策略：只能修改自己创建的工单，或管理员可修改所有
CREATE POLICY "work_orders_update_policy" ON work_orders
FOR UPDATE
USING (
  auth.uid() IN (
    SELECT id FROM users WHERE role = 'admin'
  )
  OR owner_id = auth.uid()
);

-- DELETE策略：只能删除自己创建的工单，或管理员可删除所有
CREATE POLICY "work_orders_delete_policy" ON work_orders
FOR DELETE
USING (
  auth.uid() IN (
    SELECT id FROM users WHERE role = 'admin'
  )
  OR owner_id = auth.uid()
);

-- ============================================
-- applicants 表的 RLS 策略
-- ============================================

-- SELECT策略：中方员工可查看所有，日方员工只能查看自己创建的
CREATE POLICY "applicants_select_policy" ON applicants
FOR SELECT
USING (
  auth.uid() IN (
    SELECT id FROM users WHERE role = 'admin'
  )
  OR
  auth.uid() IN (
    SELECT id FROM users WHERE country = '中国'
  )
  OR
  (
    auth.uid() IN (
      SELECT id FROM users WHERE country = '日本'
    )
    AND owner_id = auth.uid()
  )
);

-- INSERT策略：所有认证用户都可以创建应聘者
CREATE POLICY "applicants_insert_policy" ON applicants
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
);

-- UPDATE策略：只能修改自己创建的应聘者，或管理员可修改所有
CREATE POLICY "applicants_update_policy" ON applicants
FOR UPDATE
USING (
  auth.uid() IN (
    SELECT id FROM users WHERE role = 'admin'
  )
  OR owner_id = auth.uid()
);

-- DELETE策略：只能删除自己创建的应聘者，或管理员可删除所有
CREATE POLICY "applicants_delete_policy" ON applicants
FOR DELETE
USING (
  auth.uid() IN (
    SELECT id FROM users WHERE role = 'admin'
  )
  OR owner_id = auth.uid()
);

-- ============================================
-- 第五部分：验证变更
-- ============================================

-- 验证 work_orders 表结构
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'work_orders' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 验证 applicants 表结构
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'applicants' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 验证 tasks 表是否已删除
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'tasks';

-- 查看 work_orders 的 RLS 策略
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'work_orders';

-- 查看 applicants 的 RLS 策略
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'applicants';
