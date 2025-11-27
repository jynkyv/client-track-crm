-- 数据库更新脚本 - Stage 3
-- 添加企业管理、工单管理、求职者管理和任务中心相关功能
-- 请在Supabase控制台的SQL编辑器中执行以下SQL
-- 
-- 重要说明：
-- 1. target_company字段保留（已有数据），但后续功能不再使用
-- 2. 外键约束：确保数据完整性，删除企业/工单时，关联的customer字段会被设置为NULL（ON DELETE SET NULL）
--    外键约束的作用：防止插入无效的company_id/work_order_id，确保引用的记录存在
-- 3. customers表的文档字段使用TEXT[]（多文件），applicants表的文档字段使用TEXT（单文件）
-- 4. 工单必须关联企业（work_orders.company_id NOT NULL），工单是企业下面的一个属性
-- 5. 求职者状态字段有CHECK约束，限制状态值：'待面试', '面试中', '已通过', '已拒绝', '培训中', '已完成'
-- 6. 所有数组字段（TEXT[]）用于存储多个PDF URL，使用PostgreSQL数组类型

-- ============================================
-- 第一部分：customers表新增字段
-- ============================================

-- 1. 添加关联企业和工单字段
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS company_id UUID,
ADD COLUMN IF NOT EXISTS work_order_id UUID;

-- 2. 添加正式客户详细信息字段
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS household_location VARCHAR(200),
ADD COLUMN IF NOT EXISTS current_residence VARCHAR(200),
ADD COLUMN IF NOT EXISTS wechat VARCHAR(100),
ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(100),
ADD COLUMN IF NOT EXISTS emergency_phone VARCHAR(20);

-- 3. 添加文档字段（使用TEXT[]数组类型存储多个PDF URL）
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS resume TEXT[],
ADD COLUMN IF NOT EXISTS passport TEXT[],
ADD COLUMN IF NOT EXISTS household_book TEXT[],
ADD COLUMN IF NOT EXISTS id_card TEXT[],
ADD COLUMN IF NOT EXISTS photo_2inch TEXT[],
ADD COLUMN IF NOT EXISTS credit_report TEXT[],
ADD COLUMN IF NOT EXISTS no_crime_cert TEXT[],
ADD COLUMN IF NOT EXISTS national_cert TEXT[],
ADD COLUMN IF NOT EXISTS provincial_cert TEXT[],
ADD COLUMN IF NOT EXISTS employment_contract TEXT[],
ADD COLUMN IF NOT EXISTS japan_agency_contract TEXT[],
ADD COLUMN IF NOT EXISTS immigration_materials TEXT[];

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_customers_company_id ON customers(company_id);
CREATE INDEX IF NOT EXISTS idx_customers_work_order_id ON customers(work_order_id);

-- ============================================
-- 第二部分：创建companies表（企业管理）
-- ============================================

CREATE TABLE IF NOT EXISTS companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(200) NOT NULL, -- 企业名称
  industry VARCHAR(100), -- 所属行业
  legal_number VARCHAR(50), -- 法人番号
  representative VARCHAR(100), -- 代表取缔役
  employee_count INTEGER, -- 公司从业人数
  registered_capital VARCHAR(100), -- 注册资本金
  address TEXT, -- 公司地址
  contact VARCHAR(100), -- 联系方式
  email VARCHAR(100), -- 联系邮箱
  -- PDF文档字段（使用TEXT[]数组类型存储多个PDF URL）
  teihon TEXT[], -- 藤本
  financial_report TEXT[], -- 决算报告书
  industry_license TEXT[], -- 行业许可证
  gmo_contract TEXT[], -- GMO合同
  otit_materials TEXT[], -- OTIT资料
  central_materials TEXT[], -- 中央会资料
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_industry ON companies(industry);

-- 创建更新时间触发器
CREATE TRIGGER update_companies_updated_at 
    BEFORE UPDATE ON companies 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 第三部分：创建work_orders表（工单管理）
-- ============================================

CREATE TABLE IF NOT EXISTS work_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL, -- 关联企业
  name VARCHAR(200) NOT NULL, -- 工单名称
  position VARCHAR(100), -- 岗位名称
  recruit_count INTEGER, -- 招聘人数
  salary VARCHAR(100), -- 薪资
  work_time VARCHAR(100), -- 工作时间
  rest_days VARCHAR(100), -- 休息天数
  benefits TEXT, -- 工作待遇
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_work_orders_company_id ON work_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_name ON work_orders(name);

-- 创建更新时间触发器
CREATE TRIGGER update_work_orders_updated_at 
    BEFORE UPDATE ON work_orders 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 第四部分：创建applicants表（求职者管理）
-- ============================================

CREATE TABLE IF NOT EXISTS applicants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE NOT NULL, -- 关联工单
  name VARCHAR(100) NOT NULL, -- 姓名
  gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')), -- 性别
  birth_date DATE, -- 出生年月日
  household_location VARCHAR(200), -- 户籍所在地
  current_residence VARCHAR(200), -- 现居住地
  contact VARCHAR(100), -- 联系方式
  wechat VARCHAR(100), -- 实名微信号
  emergency_contact VARCHAR(100), -- 紧急联系人
  emergency_phone VARCHAR(20), -- 紧急联系人电话
  manager_name VARCHAR(100), -- 负责人姓名（中方员工姓名）
  status VARCHAR(50) CHECK (status IN ('待面试', '面试中', '已通过', '已拒绝', '培训中', '已完成')), -- 状态
  -- 文档字段（使用TEXT类型存储单个PDF URL）
  resume TEXT, -- 原始简历
  passport TEXT, -- 护照
  household_book TEXT, -- 户口本
  id_card TEXT, -- 身份证
  photo_2inch TEXT, -- 2寸照片
  credit_report TEXT, -- 征信报告
  no_crime_cert TEXT, -- 无犯罪证明
  national_cert TEXT, -- 国检证书
  provincial_cert TEXT, -- 省级考试证书
  employment_contract TEXT, -- 雇佣合同
  japan_agency_contract TEXT, -- 赴日中介合同
  immigration_materials TEXT, -- 入管局资料
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_applicants_work_order_id ON applicants(work_order_id);
CREATE INDEX IF NOT EXISTS idx_applicants_name ON applicants(name);
CREATE INDEX IF NOT EXISTS idx_applicants_status ON applicants(status);

-- 创建更新时间触发器
CREATE TRIGGER update_applicants_updated_at 
    BEFORE UPDATE ON applicants 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 第五部分：创建tasks表（任务中心）
-- ============================================

CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL, -- 关联企业（可为空，因为可能存储企业名称字符串）
  company_name VARCHAR(200), -- 企业名称（冗余字段，用于搜索和显示）
  work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL, -- 关联工单（可为空）
  work_order_name VARCHAR(200), -- 工单名称（冗余字段，用于搜索和显示）
  applicant_id UUID REFERENCES applicants(id) ON DELETE SET NULL, -- 关联求职者（可为空）
  applicant_name VARCHAR(100), -- 求职者姓名（冗余字段，用于搜索和显示）
  error_fields TEXT[] NOT NULL, -- 有误信息（报错的字段列表）
  remark TEXT, -- 备注
  reject_reason TEXT, -- 驳回理由
  status VARCHAR(20) CHECK (status IN ('pending', 'processed', 'rejected')) DEFAULT 'pending', -- 状态：待处理、已处理、被驳回
  created_by VARCHAR(50), -- 创建人
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_tasks_company_id ON tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_work_order_id ON tasks(work_order_id);
CREATE INDEX IF NOT EXISTS idx_tasks_applicant_id ON tasks(applicant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);

-- 创建更新时间触发器
CREATE TRIGGER update_tasks_updated_at 
    BEFORE UPDATE ON tasks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 第六部分：添加外键约束
-- ============================================

-- 外键约束说明：
-- 外键约束确保数据完整性，当关联的记录被删除时：
-- ON DELETE SET NULL: 如果关联的企业/工单被删除，customer的company_id/work_order_id会被设置为NULL
-- ON DELETE CASCADE: 如果关联的企业/工单被删除，customer记录也会被删除（不推荐用于customers表）
-- ON DELETE RESTRICT: 如果有关联的customer，不允许删除企业/工单（更安全，但需要先处理关联数据）

-- 为customers表添加外键约束
-- 注意：如果customers表中已有数据，且company_id/work_order_id引用了不存在的记录，添加外键会失败
-- 建议：先确保所有company_id和work_order_id都是有效的，或者先设置为NULL

ALTER TABLE customers 
ADD CONSTRAINT fk_customers_company_id 
FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;

ALTER TABLE customers 
ADD CONSTRAINT fk_customers_work_order_id 
FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE SET NULL;

-- ============================================
-- 验证表结构
-- ============================================

-- 验证customers表新增字段
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'customers' 
AND table_schema = 'public'
AND column_name IN ('company_id', 'work_order_id', 'birth_date', 'household_location', 
                    'current_residence', 'wechat', 'emergency_contact', 'emergency_phone',
                    'resume', 'passport', 'household_book', 'id_card', 'photo_2inch',
                    'credit_report', 'no_crime_cert', 'national_cert', 'provincial_cert',
                    'employment_contract', 'japan_agency_contract', 'immigration_materials')
ORDER BY column_name;

-- 验证新创建的表
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('companies', 'work_orders', 'applicants', 'tasks')
ORDER BY table_name;

-- 验证外键约束
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'customers'
  AND tc.table_schema = 'public';

