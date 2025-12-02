-- 修复聊天系统的外键约束
-- 将 auth.users 改为 users 表

-- ============================================
-- 修复 conversations 表
-- ============================================

-- 删除旧的外键约束
ALTER TABLE conversations 
DROP CONSTRAINT IF EXISTS conversations_user1_id_fkey,
DROP CONSTRAINT IF EXISTS conversations_user2_id_fkey;

-- 添加新的外键约束，指向 users 表
ALTER TABLE conversations 
ADD CONSTRAINT conversations_user1_id_fkey 
  FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
ADD CONSTRAINT conversations_user2_id_fkey 
  FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================
-- 修复 messages 表
-- ============================================

-- 删除旧的外键约束
ALTER TABLE messages 
DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;

-- 添加新的外键约束，指向 users 表
ALTER TABLE messages 
ADD CONSTRAINT messages_sender_id_fkey 
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================
-- 禁用 RLS（因为不使用 Supabase Auth）
-- ============================================

ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 重新创建 get_or_create_conversation 函数
-- ============================================

DROP FUNCTION IF EXISTS get_or_create_conversation(UUID, VARCHAR, UUID, VARCHAR);

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
$$ LANGUAGE plpgsql;

-- ============================================
-- 验证
-- ============================================

-- 查看外键约束
SELECT
  tc.table_name, 
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name IN ('conversations', 'messages')
ORDER BY tc.table_name;
