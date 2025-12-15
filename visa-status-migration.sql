-- 签证状态功能数据库迁移脚本
-- 运行时间: 2025-12-15

-- 客户表添加签证状态字段
ALTER TABLE customers ADD COLUMN IF NOT EXISTS visa_status VARCHAR(20) DEFAULT 'pending';
COMMENT ON COLUMN customers.visa_status IS '签证状态：pending(待办签证) 或 completed(已完成)';
