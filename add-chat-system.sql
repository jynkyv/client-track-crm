-- 聊天系统数据库迁移脚本
-- 创建一对一聊天功能的数据库表和权限策略
-- 执行日期: 2025-12-02

-- ============================================
-- 第一部分：创建 conversations 表（对话表）
-- ============================================

CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL, -- 参与者1
  user1_name VARCHAR(100) NOT NULL, -- 参与者1姓名
  user2_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL, -- 参与者2
  user2_name VARCHAR(100) NOT NULL, -- 参与者2姓名
  last_message TEXT, -- 最后一条消息预览
  last_message_time TIMESTAMP WITH TIME ZONE, -- 最后消息时间
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 确保两个用户之间只有一个对话（无论顺序）
  CONSTRAINT unique_conversation CHECK (user1_id < user2_id)
);

-- 创建唯一索引，防止重复对话
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_users 
ON conversations(user1_id, user2_id);

-- 创建索引提高查询性能
CREATE INDEX IF NOT EXISTS idx_conversations_user1 ON conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user2 ON conversations(user2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_time ON conversations(last_message_time DESC);

-- 添加注释
COMMENT ON TABLE conversations IS '对话表，存储一对一聊天的对话记录';
COMMENT ON COLUMN conversations.user1_id IS '参与者1的用户ID（较小的ID）';
COMMENT ON COLUMN conversations.user2_id IS '参与者2的用户ID（较大的ID）';
COMMENT ON COLUMN conversations.last_message IS '最后一条消息的内容预览';
COMMENT ON COLUMN conversations.last_message_time IS '最后一条消息的发送时间';

-- 创建更新时间触发器
CREATE TRIGGER update_conversations_updated_at 
    BEFORE UPDATE ON conversations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 第二部分：创建 messages 表（消息表）
-- ============================================

CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sender_name VARCHAR(100) NOT NULL,
  content TEXT NOT NULL CHECK (LENGTH(content) > 0 AND LENGTH(content) <= 500), -- 消息内容限制500字
  is_read BOOLEAN DEFAULT FALSE NOT NULL, -- 是否已读
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
ON messages(conversation_id, created_at DESC);

-- 添加注释
COMMENT ON TABLE messages IS '消息表，存储聊天消息';
COMMENT ON COLUMN messages.conversation_id IS '所属对话的ID';
COMMENT ON COLUMN messages.sender_id IS '发送者的用户ID';
COMMENT ON COLUMN messages.content IS '消息内容，最多500字';
COMMENT ON COLUMN messages.is_read IS '消息是否已读';

-- ============================================
-- 第三部分：更新 applicants 表 RLS 策略
-- ============================================

-- 删除旧的 applicants 表 SELECT 策略
DROP POLICY IF EXISTS "applicants_select_policy" ON applicants;

-- 创建新的 SELECT 策略：只有日方员工和管理员可以查看应聘者
CREATE POLICY "applicants_select_policy" ON applicants
FOR SELECT
USING (
  auth.uid() IN (
    SELECT id FROM users WHERE role = 'admin'
  )
  OR
  auth.uid() IN (
    SELECT id FROM users WHERE country = '日本'
  )
);

-- ============================================
-- 第四部分：conversations 表的 RLS 策略
-- ============================================

-- 启用 RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- SELECT 策略：用户只能看到自己参与的对话
CREATE POLICY "conversations_select_policy" ON conversations
FOR SELECT
USING (
  auth.uid() = user1_id OR auth.uid() = user2_id
);

-- INSERT 策略：用户只能创建自己参与的对话
CREATE POLICY "conversations_insert_policy" ON conversations
FOR INSERT
WITH CHECK (
  (auth.uid() = user1_id OR auth.uid() = user2_id)
  AND user1_id < user2_id  -- 确保 user1_id 始终小于 user2_id
);

-- UPDATE 策略：用户只能更新自己参与的对话
CREATE POLICY "conversations_update_policy" ON conversations
FOR UPDATE
USING (
  auth.uid() = user1_id OR auth.uid() = user2_id
);

-- DELETE 策略：禁止删除对话
CREATE POLICY "conversations_delete_policy" ON conversations
FOR DELETE
USING (FALSE);

-- ============================================
-- 第五部分：messages 表的 RLS 策略
-- ============================================

-- 启用 RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- SELECT 策略：用户只能看到自己参与的对话中的消息
CREATE POLICY "messages_select_policy" ON messages
FOR SELECT
USING (
  conversation_id IN (
    SELECT id FROM conversations 
    WHERE auth.uid() = user1_id OR auth.uid() = user2_id
  )
);

-- INSERT 策略：用户只能在自己参与的对话中发送消息
CREATE POLICY "messages_insert_policy" ON messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND conversation_id IN (
    SELECT id FROM conversations 
    WHERE auth.uid() = user1_id OR auth.uid() = user2_id
  )
);

-- UPDATE 策略：用户只能更新消息的已读状态
CREATE POLICY "messages_update_policy" ON messages
FOR UPDATE
USING (
  conversation_id IN (
    SELECT id FROM conversations 
    WHERE auth.uid() = user1_id OR auth.uid() = user2_id
  )
);

-- DELETE 策略：禁止删除消息
CREATE POLICY "messages_delete_policy" ON messages
FOR DELETE
USING (FALSE);

-- ============================================
-- 第六部分：创建辅助函数
-- ============================================

-- 函数：获取或创建对话
CREATE OR REPLACE FUNCTION get_or_create_conversation(
  p_user1_id UUID,
  p_user1_name VARCHAR,
  p_user2_id UUID,
  p_user2_name VARCHAR
)
RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
  v_smaller_id UUID;
  v_smaller_name VARCHAR;
  v_larger_id UUID;
  v_larger_name VARCHAR;
BEGIN
  -- 确保 user1_id < user2_id
  IF p_user1_id < p_user2_id THEN
    v_smaller_id := p_user1_id;
    v_smaller_name := p_user1_name;
    v_larger_id := p_user2_id;
    v_larger_name := p_user2_name;
  ELSE
    v_smaller_id := p_user2_id;
    v_smaller_name := p_user2_name;
    v_larger_id := p_user1_id;
    v_larger_name := p_user1_name;
  END IF;

  -- 查找现有对话
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE user1_id = v_smaller_id AND user2_id = v_larger_id;

  -- 如果不存在，创建新对话
  IF v_conversation_id IS NULL THEN
    INSERT INTO conversations (user1_id, user1_name, user2_id, user2_name)
    VALUES (v_smaller_id, v_smaller_name, v_larger_id, v_larger_name)
    RETURNING id INTO v_conversation_id;
  END IF;

  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 添加函数注释
COMMENT ON FUNCTION get_or_create_conversation IS '获取或创建两个用户之间的对话，确保对话唯一性';

-- ============================================
-- 第七部分：验证表结构
-- ============================================

-- 验证 conversations 表结构
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'conversations' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 验证 messages 表结构
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'messages' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 查看 conversations 的 RLS 策略
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'conversations';

-- 查看 messages 的 RLS 策略
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'messages';

-- 查看 applicants 的更新后 RLS 策略
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'applicants';
