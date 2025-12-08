-- 企业表新增文档字段迁移脚本
-- 添加两个新的文档字段：
-- 1. instructor_license - 技能実習指導員講習许可证
-- 2. visa_application - 入国管理局签证申请
-- 执行日期: 2025-12-08

-- ============================================
-- 添加新字段到 companies 表
-- ============================================

-- 添加 instructor_license 字段（技能実習指導員講習许可证）
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS instructor_license TEXT[];

COMMENT ON COLUMN companies.instructor_license IS '技能実習指導員講習许可证文件URL数组';

-- 添加 visa_application 字段（入国管理局签证申请）
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS visa_application TEXT[];

COMMENT ON COLUMN companies.visa_application IS '入国管理局签证申请文件URL数组';

-- ============================================
-- 验证
-- ============================================

-- 查看表结构确认新字段已添加
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'companies' 
AND column_name IN ('instructor_license', 'visa_application');
