import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 数据库表类型定义
export interface User {
  id: string
  username: string
  password: string
  role: 'admin' | 'employee'
  country?: string // 国家
  created_at: string
}

export interface Customer {
  id: string
  nickname: string
  contact: string
  source: string
  intention: string
  status: 'communicating' | 'closed' | 'rejected'
  work_experience: string
  age: number
  gender: 'male' | 'female' | 'other'
  notes: string
  owner: string
  follow_ups: FollowUp[]
  // 正式客户相关字段
  real_name?: string
  phone?: string
  target_company?: string
  hourly_rate?: number
  wallet_balance?: number
  company_id?: string
  work_order_id?: string
  stage2_status?: '待面试' | '已通知面试' | '面试通过' | '面试失败' | '培训中' | '已完成'
  interview_notice_time?: string
  last_payment_time?: string
  // 个人信息字段
  birth_date?: string
  household_location?: string
  current_residence?: string
  wechat?: string
  emergency_contact?: string
  emergency_phone?: string
  // 文档字段（多文件，TEXT[]）
  resume?: string[]
  passport?: string[]
  household_book?: string[]
  id_card?: string[]
  photo_2inch?: string[]
  credit_report?: string[]
  no_crime_cert?: string[]
  national_cert?: string[]
  provincial_cert?: string[]
  employment_contract?: string[]
  japan_agency_contract?: string[]
  immigration_materials?: string[]
  created_at: string
  updated_at: string
}

export interface FollowUp {
  id: string
  time: string
  content: string
}

export interface Payment {
  id: string
  customer_id: string
  amount: number
  payment_name?: string
  payment_time: string
  notes?: string
  created_at: string
  created_by: string
}

// 工单类型定义
export interface Ticket {
  id: string
  name: string // 工单名称
  company_id: string // 企业ID
  position: string // 岗位名称
  recruit_count: number // 招聘人数
  salary: string // 薪资
  work_time: string // 工作时间
  rest_days: string // 休息天数
  benefits: string // 工作待遇
  owner_id: string // 负责人ID（创建者）
  owner_name: string // 负责人姓名
  created_at: string
  updated_at: string
}

// 应聘者类型定义
export interface Applicant {
  id: string
  work_order_id: string // 关联工单ID
  name: string // 姓名
  gender: string // 性别
  birth_date: string // 出生年月日
  household_location: string // 户籍所在地
  current_residence: string // 现居住地
  contact: string // 联系方式
  wechat: string // 实名微信号
  emergency_contact: string // 紧急联系人
  emergency_phone: string // 紧急联系人电话
  owner_id?: string // 负责人ID（创建者）
  owner_name?: string // 负责人姓名
  manager_name?: string // 负责人姓名（已废弃，使用owner_name）
  status?: string // 状态
  // 文档字段
  resume?: string // 原始简历
  passport?: string // 护照
  household_book?: string // 户口本
  id_card?: string // 身份证
  photo_2inch?: string // 2寸照片
  credit_report?: string // 征信报告
  no_crime_cert?: string // 无犯罪证明
  national_cert?: string // 国检证书
  provincial_cert?: string // 省级考试证书
  employment_contract?: string // 雇佣合同
  japan_agency_contract?: string // 赴日中介合同
  immigration_materials?: string // 入管局资料
  created_at?: string
  updated_at?: string
}

// 企业类型定义
export interface Company {
  id: string
  name: string // 企业名称
  industry?: string // 所属行业
  legal_number?: string // 法人番号
  representative?: string // 代表取缔役
  employee_count?: number // 公司从业人数
  registered_capital?: string // 注册资本金
  address?: string // 公司地址
  contact?: string // 联系方式
  email?: string // 联系邮箱
  // PDF文档字段
  teihon?: string[] // 藤本
  financial_report?: string[] // 决算报告书
  industry_license?: string[] // 行业许可证
  gmo_contract?: string[] // GMO合同
  otit_materials?: string[] // OTIT资料
  central_materials?: string[] // 中央会资料
  instructor_license?: string[] // 技能実習指導員講習许可证
  visa_application?: string[] // 入国管理局签证申请
  created_at: string
  updated_at: string
}

// 对话类型定义
export interface Conversation {
  id: string
  user1_id: string // 参与者1的用户ID
  user1_name: string // 参与者1姓名
  user2_id: string // 参与者2的用户ID
  user2_name: string // 参与者2姓名
  last_message?: string // 最后一条消息预览
  last_message_time?: string // 最后消息时间
  created_at: string
  updated_at: string
}

// 消息类型定义
export interface Message {
  id: string
  conversation_id: string // 所属对话的ID
  sender_id: string // 发送者的用户ID
  sender_name: string // 发送者姓名
  content: string // 消息内容（最多500字）
  is_read: boolean // 是否已读
  created_at: string
}

