import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import jaJP from 'antd/locale/ja_JP'
import { DashboardLayout } from '@/components/DashboardLayout'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '客户跟踪CRM系统',
  description: '基于Next.js和Supabase的客户关系管理系统',
}

export default async function RootLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  const messages = await getMessages();
  const antdLocale = locale === 'ja' ? jaJP : zhCN;

  return (
    <html lang={locale}>
      <body className={inter.className}>
        <NextIntlClientProvider messages={messages}>
          <ConfigProvider locale={antdLocale}>
            <AuthProvider>
              <DashboardLayout>
                {children}
              </DashboardLayout>
            </AuthProvider>
          </ConfigProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}