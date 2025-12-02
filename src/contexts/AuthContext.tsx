'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase, User } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  isAdmin: boolean
  isEmployee: boolean
  isChineseEmployee: boolean // 是否是中方员工（role='employee' + country='中国'）
  isJapaneseEmployee: boolean // 是否是日方员工（role='employee' + country='日本'）
  canAccessCustomers: boolean // 是否可以访问客户管理
  canAccessCompanies: boolean // 是否可以访问企业管理
  canAccessTickets: boolean // 是否可以访问工单列表
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // 使用setTimeout避免同步setState警告
    setTimeout(() => {
      // 检查本地存储的用户信息
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser))
        } catch (error) {
          console.error('解析用户信息失败:', error)
          localStorage.removeItem('user')
        }
      }
      setMounted(true)
      setLoading(false)
    }, 0)
  }, [])

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      // 先查询用户是否存在
      const { data: users, error: queryError } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)

      if (queryError) {
        console.error('Query error:', queryError)
        return false
      }

      if (!users || users.length === 0) {
        return false
      }

      const user = users[0]

      // 验证密码
      if (user.password === password) {
        setUser(user)
        localStorage.setItem('user', JSON.stringify(user))
        return true
      } else {
        return false
      }
    } catch (error) {
      console.error('Login error:', error)
      return false
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('user')
  }

  const isAdmin = user?.role === 'admin'
  const isEmployee = user?.role === 'employee'
  const isChineseEmployee = isEmployee && user?.country === '中国'
  const isJapaneseEmployee = isEmployee && user?.country === '日本'

  // 权限判断
  // 管理员可以访问所有功能
  // 中方员工（role='employee' + country='中国'）：可以访问客户管理和工单列表（查看所有日方员工创建的工单）
  // 日方员工（role='employee' + country='日本'）：可以访问企业管理和工单列表（仅查看自己创建的工单）
  const canAccessCustomers = isAdmin || isChineseEmployee
  const canAccessCompanies = isAdmin || isJapaneseEmployee
  const canAccessTickets = isAdmin || isChineseEmployee || isJapaneseEmployee

  // 防止水合错误，在客户端挂载前不渲染内容
  if (!mounted) {
    return null
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      isAdmin,
      isEmployee,
      isChineseEmployee,
      isJapaneseEmployee,
      canAccessCustomers,
      canAccessCompanies,
      canAccessTickets
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
