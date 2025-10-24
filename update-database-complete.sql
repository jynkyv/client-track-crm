-- 完整的数据库更新脚本
-- 请在Supabase控制台的SQL编辑器中执行以下SQL

-- 1. 添加status字段（如果不存在）
ALTER TABLE customers ADD COLUMN IF NOT EXISTS status VARCHAR(20) CHECK (status IN ('communicating', 'closed', 'rejected')) DEFAULT 'communicating';

-- 2. 添加work_experience字段（如果不存在）
ALTER TABLE customers ADD COLUMN IF NOT EXISTS work_experience TEXT;

-- 3. 添加age字段（如果不存在）
ALTER TABLE customers ADD COLUMN IF NOT EXISTS age INTEGER;

-- 4. 添加gender字段（如果不存在）
ALTER TABLE customers ADD COLUMN IF NOT EXISTS gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other'));

-- 5. 添加notes字段（如果不存在）
ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes TEXT;

-- 6. 添加owner字段（如果不存在）
ALTER TABLE customers ADD COLUMN IF NOT EXISTS owner VARCHAR(50) NOT NULL DEFAULT 'employee';

-- 7. 添加updated_at字段（如果不存在）
ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 8. 创建更新时间触发器函数（如果不存在）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 9. 创建更新时间触发器（如果不存在）
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at 
    BEFORE UPDATE ON customers 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 10. 为现有客户设置默认status值
UPDATE customers SET status = 'communicating' WHERE status IS NULL;

-- 11. 为现有客户设置默认owner值
UPDATE customers SET owner = 'employee' WHERE owner IS NULL OR owner = '';

-- 12. 验证表结构
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'customers' 
AND table_schema = 'public'
ORDER BY ordinal_position;
