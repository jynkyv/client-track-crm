-- 快速修复 work_orders RLS INSERT 策略
-- 执行此脚本来解决创建工单时的 RLS 错误

-- 删除现有的 INSERT 策略
DROP POLICY IF EXISTS "work_orders_insert_policy" ON work_orders;

-- 重新创建 INSERT 策略：允许所有认证用户创建工单
CREATE POLICY "work_orders_insert_policy" ON work_orders
FOR INSERT
WITH CHECK (
  -- 检查用户已认证
  auth.uid() IS NOT NULL
);

-- 验证策略
SELECT policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'work_orders'
AND cmd = 'INSERT';
