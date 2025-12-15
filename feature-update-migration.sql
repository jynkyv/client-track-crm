-- 功能更新数据库迁移脚本
-- 运行时间: 2025-12-15

-- 企业表添加雇佣合同字段
ALTER TABLE companies ADD COLUMN IF NOT EXISTS employment_contract JSONB;

-- 工单表添加住宿相关字段
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS accommodation_type VARCHAR(10);
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS accommodation_address TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS work_environment_images JSONB;

-- 添加注释说明字段用途
COMMENT ON COLUMN companies.employment_contract IS '雇佣合同文件列表（JSON格式存储）';
COMMENT ON COLUMN work_orders.accommodation_type IS '住宿类型：free（无料）或 paid（有料）';
COMMENT ON COLUMN work_orders.accommodation_address IS '住宿地址';
COMMENT ON COLUMN work_orders.work_environment_images IS '工作环境图片列表（JSON格式存储）';

-- 客户表添加毕业证字段
ALTER TABLE customers ADD COLUMN IF NOT EXISTS graduation_cert JSONB;
COMMENT ON COLUMN customers.graduation_cert IS '毕业证文件列表（JSON格式存储）';
