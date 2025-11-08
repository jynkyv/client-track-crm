-- 更新客户表，添加正式客户相关字段
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS real_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS target_company VARCHAR(200),
ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS wallet_balance DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS stage2_status VARCHAR(50) CHECK (stage2_status IN ('待面试', '已通知面试', '面试通过', '面试失败', '培训中', '已完成')),
ADD COLUMN IF NOT EXISTS interview_notice_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_payment_time TIMESTAMP WITH TIME ZONE;

-- 创建付款记录表
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_name VARCHAR(100),
  payment_time TIMESTAMP WITH TIME ZONE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(50) NOT NULL
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_time ON payments(payment_time);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_stage2_status ON customers(stage2_status);


