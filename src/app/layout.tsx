import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { DashboardLayout } from '@/components/DashboardLayout'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '客户跟踪CRM系统',
  description: '基于Next.js和Supabase的客户关系管理系统',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh">
      <body className={inter.className}>
        <ConfigProvider locale={zhCN}>
          <AuthProvider>
            <DashboardLayout>
              {children}
            </DashboardLayout>
          </AuthProvider>
        </ConfigProvider>
      </body>
    </html>
  )
}