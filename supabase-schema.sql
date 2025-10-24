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

-- 插入默认管理员账号
INSERT INTO users (username, password, role) 
VALUES ('admin', 'admin', 'admin')
ON CONFLICT (username) DO NOTHING;

-- 插入默认员工账号
INSERT INTO users (username, password, role) 
VALUES ('employee', 'employee', 'employee')
ON CONFLICT (username) DO NOTHING;
