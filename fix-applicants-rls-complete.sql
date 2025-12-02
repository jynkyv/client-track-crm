-- 同样修复 applicants 表的 RLS 策略
-- 确保应聘者的创建、查询、更新、删除都能正常工作

-- ============================================
-- 删除所有现有策略
-- ============================================

DROP POLICY IF EXISTS "applicants_select_policy" ON applicants;
DROP POLICY IF EXISTS "applicants_insert_policy" ON applicants;
DROP POLICY IF EXISTS "applicants_update_policy" ON applicants;
DROP POLICY IF EXISTS "applicants_delete_policy" ON applicants;

-- ============================================
-- 重新创建所有策略
-- ============================================

-- SELECT 策略：管理员看所有，日方员工看所有，中方员工看不到（通过返回false）
CREATE POLICY "applicants_select_policy" ON applicants
FOR SELECT
USING (
  -- 管理员可以看所有
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
  OR
  -- 日方员工可以看所有（他们负责管理应聘者）
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.country = '日本'
  )
);

-- INSERT 策略：所有认证用户都可以创建（但实际上只有日方员工会创建）
CREATE POLICY "applicants_insert_policy" ON applicants
FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATE 策略：管理员可以改所有，其他人只能改自己创建的
CREATE POLICY "applicants_update_policy" ON applicants
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

-- DELETE 策略：管理员可以删所有，其他人只能删自己创建的
CREATE POLICY "applicants_delete_policy" ON applicants
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
-- 验证策略
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
AND tablename = 'applicants'
ORDER BY cmd, policyname;
