-- 创建账号表
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) CHECK (role IN ('admin', 'employee')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建客户表
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nickname VARCHAR(100) NOT NULL,
  contact VARCHAR(100) NOT NULL,
  source VARCHAR(100) NOT NULL,
  intention VARCHAR(50) NOT NULL,
  status VARCHAR(20) CHECK (status IN ('communicating', 'closed', 'rejected')) DEFAULT 'communicating',
  work_experience TEXT,
  age INTEGER,
  gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
  notes TEXT,
  owner VARCHAR(50) NOT NULL,
  follow_ups JSONB DEFAULT '[]'::jsonb,
  -- 正式客户相关字段
  real_name VARCHAR(100),
  phone VARCHAR(20),
  target_company VARCHAR(200),
  hourly_rate DECIMAL(10,2),
  wallet_balance DECIMAL(10,2) DEFAULT 0,
  stage2_status VARCHAR(50) CHECK (stage2_status IN ('待面试', '已通知面试', '面试通过', '面试失败', '培训中', '已完成')),
  interview_notice_time TIMESTAMP WITH TIME ZONE,
  last_payment_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_customers_updated_at 
    BEFORE UPDATE ON customers 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

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

-- 插入默认管理员账号
INSERT INTO users (username, password, role) 
VALUES ('admin', 'admin', 'admin')
ON CONFLICT (username) DO NOTHING;

-- 插入默认员工账号
INSERT INTO users (username, password, role) 
VALUES ('employee', 'employee', 'employee')
ON CONFLICT (username) DO NOTHING;
