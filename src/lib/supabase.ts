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
