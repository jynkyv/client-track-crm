-- 修复历史记录：将 owner 从 "chen" 更新为 "堀江 信吾1"

-- 更新 customers 表
UPDATE customers 
SET owner = '堀江 信吾1' 
WHERE owner = 'chen';

-- 更新 work_orders 表
UPDATE work_orders 
SET owner_name = '堀江 信吾1' 
WHERE owner_name = 'chen';

-- 更新 applicants 表
UPDATE applicants 
SET owner = '堀江 信吾1' 
WHERE owner = 'chen';

-- 更新 conversations 表的 user1_name
UPDATE conversations 
SET user1_name = '堀江 信吾1' 
WHERE user1_name = 'chen';

-- 更新 conversations 表的 user2_name
UPDATE conversations 
SET user2_name = '堀江 信吾1' 
WHERE user2_name = 'chen';

-- 更新 messages 表的 sender_name
UPDATE messages 
SET sender_name = '堀江 信吾1' 
WHERE sender_name = 'chen';

-- 检查更新结果
SELECT 'customers' as table_name, count(*) as count FROM customers WHERE owner = '堀江 信吾1'
UNION ALL
SELECT 'work_orders' as table_name, count(*) as count FROM work_orders WHERE owner_name = '堀江 信吾1'
UNION ALL
SELECT 'applicants' as table_name, count(*) as count FROM applicants WHERE owner = '堀江 信吾1'
UNION ALL
SELECT 'conversations_user1' as table_name, count(*) as count FROM conversations WHERE user1_name = '堀江 信吾1'
UNION ALL
SELECT 'conversations_user2' as table_name, count(*) as count FROM conversations WHERE user2_name = '堀江 信吾1'
UNION ALL
SELECT 'messages' as table_name, count(*) as count FROM messages WHERE sender_name = '堀江 信吾1';
