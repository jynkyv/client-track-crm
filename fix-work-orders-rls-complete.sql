-- 完整修复 work_orders 表的 RLS 策略
-- 此脚本会删除所有旧策略并重新创建正确的策略

-- ============================================
-- 第一步：删除所有现有策略
-- ============================================

DROP POLICY IF EXISTS "work_orders_select_policy" ON work_orders;
DROP POLICY IF EXISTS "work_orders_insert_policy" ON work_orders;
DROP POLICY IF EXISTS "work_orders_update_policy" ON work_orders;
DROP POLICY IF EXISTS "work_orders_delete_policy" ON work_orders;

-- ============================================
-- 第二步：重新创建所有策略
-- ============================================

-- SELECT 策略：管理员和中方员工看所有，日方员工只看自己的
CREATE POLICY "work_orders_select_policy" ON work_orders
FOR SELECT
USING (
  -- 管理员可以看所有
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
  OR
  -- 中方员工可以看所有
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.country = '中国'
  )
  OR
  -- 日方员工只能看自己创建的
  (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.country = '日本'
    )
    AND owner_id = auth.uid()
  )
);

-- INSERT 策略：所有认证用户都可以创建
CREATE POLICY "work_orders_insert_policy" ON work_orders
FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATE 策略：管理员可以改所有，其他人只能改自己的
CREATE POLICY "work_orders_update_policy" ON work_orders
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
  OR owner_id = auth.uid()
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
  OR owner_id = auth.uid()
);

-- DELETE 策略：管理员可以删所有，其他人只能删自己的
CREATE POLICY "work_orders_delete_policy" ON work_orders
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
  OR owner_id = auth.uid()
);

-- ============================================
-- 第三步：验证策略
-- ============================================

SELECT 
  policyname, 
  cmd,
  roles,
  CASE 
    WHEN qual IS NULL THEN 'NULL (允许所有)'
    ELSE substring(qual::text, 1, 100)
  END as using_clause,
  CASE 
    WHEN with_check IS NULL THEN 'NULL'
    ELSE substring(with_check::text, 1, 100)
  END as with_check_clause
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'work_orders'
ORDER BY cmd, policyname;
