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
  created_at: string
  updated_at: string
}

export interface FollowUp {
  id: string
  time: string
  content: string
}
