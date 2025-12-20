-- 工单问答功能迁移脚本
-- 创建问题表和回复表，用于中方员工向日方员工（工单负责人）提问

-- 工单问题表
CREATE TABLE IF NOT EXISTS work_order_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  asker_id UUID NOT NULL REFERENCES users(id),
  asker_name TEXT NOT NULL,
  content TEXT NOT NULL,
  is_answered BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 工单回复表
CREATE TABLE IF NOT EXISTS work_order_answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES work_order_questions(id) ON DELETE CASCADE,
  responder_id UUID NOT NULL REFERENCES users(id),
  responder_name TEXT NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE, -- 提问者是否已读此回复
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_work_order_questions_work_order_id ON work_order_questions(work_order_id);
CREATE INDEX IF NOT EXISTS idx_work_order_questions_asker_id ON work_order_questions(asker_id);
CREATE INDEX IF NOT EXISTS idx_work_order_questions_is_answered ON work_order_questions(is_answered);
CREATE INDEX IF NOT EXISTS idx_work_order_answers_question_id ON work_order_answers(question_id);

-- 启用RLS
ALTER TABLE work_order_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_answers ENABLE ROW LEVEL SECURITY;

-- 删除已存在的策略（如果有）
DROP POLICY IF EXISTS "work_order_questions_select" ON work_order_questions;
DROP POLICY IF EXISTS "work_order_questions_insert" ON work_order_questions;
DROP POLICY IF EXISTS "work_order_questions_update" ON work_order_questions;
DROP POLICY IF EXISTS "work_order_answers_select" ON work_order_answers;
DROP POLICY IF EXISTS "work_order_answers_insert" ON work_order_answers;

-- 问题表SELECT策略：
-- 1. 管理员可以查看所有
-- 2. 中方员工可以查看所有问题
-- 3. 日方员工只能查看自己创建的工单上的问题
CREATE POLICY "work_order_questions_select" ON work_order_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND country = '中国'
    )
    OR EXISTS (
      SELECT 1 FROM work_orders wo 
      WHERE wo.id = work_order_questions.work_order_id 
      AND wo.owner_id = auth.uid()
    )
  );

-- 问题表INSERT策略：中方员工和管理员可以创建问题
CREATE POLICY "work_order_questions_insert" ON work_order_questions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND (role = 'admin' OR country = '中国')
    )
  );

-- 问题表UPDATE策略：只有工单负责人和管理员可以更新（标记已回复）
CREATE POLICY "work_order_questions_update" ON work_order_questions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM work_orders wo 
      WHERE wo.id = work_order_questions.work_order_id 
      AND wo.owner_id = auth.uid()
    )
  );

-- 回复表SELECT策略：与问题表相同
CREATE POLICY "work_order_answers_select" ON work_order_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND country = '中国'
    )
    OR EXISTS (
      SELECT 1 FROM work_order_questions woq
      JOIN work_orders wo ON wo.id = woq.work_order_id
      WHERE woq.id = work_order_answers.question_id 
      AND wo.owner_id = auth.uid()
    )
  );

-- 回复表INSERT策略：工单负责人和管理员可以创建回复
CREATE POLICY "work_order_answers_insert" ON work_order_answers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM work_order_questions woq
      JOIN work_orders wo ON wo.id = woq.work_order_id
      WHERE woq.id = work_order_answers.question_id 
      AND wo.owner_id = auth.uid()
    )
  );

-- 注意：由于我们使用的是简单的用户认证系统而非Supabase Auth，
-- 上述RLS策略可能需要调整。在实际应用中，我们通过前端逻辑控制权限。
-- 如果RLS策略不生效，可以考虑使用以下简化策略：

-- 简化策略：允许所有认证用户访问（权限在前端控制）
-- DROP POLICY IF EXISTS "work_order_questions_select" ON work_order_questions;
-- DROP POLICY IF EXISTS "work_order_questions_insert" ON work_order_questions;
-- DROP POLICY IF EXISTS "work_order_questions_update" ON work_order_questions;
-- DROP POLICY IF EXISTS "work_order_answers_select" ON work_order_answers;
-- DROP POLICY IF EXISTS "work_order_answers_insert" ON work_order_answers;

-- CREATE POLICY "work_order_questions_all" ON work_order_questions FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY "work_order_answers_all" ON work_order_answers FOR ALL USING (true) WITH CHECK (true);
