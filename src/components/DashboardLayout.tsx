'use client'

import { useEffect } from 'react'
import { Layout, Menu, Button, Dropdown, Space } from 'antd'
import { UserOutlined, LogoutOutlined, TeamOutlined, UserAddOutlined, HomeOutlined, FileTextOutlined, CheckCircleOutlined, BankOutlined, CheckSquareOutlined } from '@ant-design/icons'
import { useAuth } from '@/contexts/AuthContext'
import { Link, usePathname, useRouter } from '@/navigation'
import ChatWidget from './ChatWidget'
import { useTranslations } from 'next-intl'
import LanguageSwitcher from './LanguageSwitcher'

const { Header, Sider, Content } = Layout

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout, isAdmin, canAccessCustomers, canAccessCompanies, canAccessTickets } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations('Dashboard')
  const tCommon = useTranslations('Common')

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  // 如果是登录页面，直接显示内容
  if (pathname === '/login') {
    return <>{children}</>
  }

  // 防止水合错误，在客户端渲染完成前显示加载状态
  if (loading) {
    return <div>{tCommon('loading')}</div>
  }

  // 如果未登录且不是登录页面，重定向到登录页
  if (!user) {
    return <div>{tCommon('loading')}</div>
  }

  const menuItems = [
    {
      key: 'dashboard',
      icon: <HomeOutlined />,
      label: <Link href="/dashboard">{t('menu.dashboard')}</Link>,
    },
    ...(canAccessCustomers ? [{
      key: 'customers',
      icon: <TeamOutlined />,
      label: t('menu.customers'),
      children: [
        {
          key: 'customers/potential',
          icon: <FileTextOutlined />,
          label: <Link href="/customers/potential">{t('menu.potentialCustomers')}</Link>,
        },
        {
          key: 'customers/contract',
          icon: <CheckCircleOutlined />,
          label: <Link href="/customers/contract">{t('menu.contractCustomers')}</Link>,
        },
      ],
    }] : []),
    ...(canAccessCompanies ? [{
      key: 'companies',
      icon: <BankOutlined />,
      label: <Link href="/companies">{t('menu.companies')}</Link>,
    }] : []),
    ...(canAccessTickets ? [{
      key: 'work-orders',
      icon: <CheckSquareOutlined />,
      label: <Link href="/work-orders">{t('menu.workOrders')}</Link>,
    }] : []),
    ...(isAdmin ? [{
      key: 'users',
      icon: <UserAddOutlined />,
      label: <Link href="/users">{t('menu.users')}</Link>,
    }] : [])
  ]

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: t('menu.logout'),
      onClick: logout,
    },
  ]

  // 获取当前选中的菜单项
  const getSelectedKey = () => {
    if (pathname === '/dashboard') return ['dashboard']
    if (pathname === '/customers/potential' || pathname === '/customers') return ['customers/potential']
    if (pathname === '/customers/contract') return ['customers/contract']
    if (pathname?.startsWith('/companies')) return ['companies']
    if (pathname?.startsWith('/work-orders')) return ['work-orders']
    if (pathname === '/users') return ['users']
    return ['dashboard']
  }

  // 获取默认展开的菜单
  const getDefaultOpenKeys = () => {
    if (pathname?.startsWith('/customers')) return ['customers']
    return []
  }

  const getUserRoleLabel = () => {
    if (user.role === 'admin') return t('userRole.admin')
    if (user.country === '中国') return t('userRole.chineseEmployee')
    if (user.country === '日本') return t('userRole.japaneseEmployee')
    return t('userRole.employee')
  }

  return (
    <Layout style={{ minHeight: '100vh', height: '100vh', overflow: 'hidden' }}>
      <Sider
        width={200}
        theme="dark"
        collapsible={false}
        style={{
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          overflow: 'hidden',
          zIndex: 100
        }}
      >
        <div style={{
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '18px',
          fontWeight: 'bold',
          flexShrink: 0
        }}>
          {t('title')}
        </div>
        <div style={{
          height: 'calc(100vh - 64px)',
          overflowY: 'auto',
          overflowX: 'hidden'
        }}>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={getSelectedKey()}
            defaultOpenKeys={getDefaultOpenKeys()}
            items={menuItems}
            style={{ width: '100%', borderRight: 0 }}
          />
        </div>
      </Sider>

      <Layout style={{ marginLeft: 200, height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header style={{
          background: '#fff',
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          flexShrink: 0,
          zIndex: 99
        }}>
          <h2 style={{ margin: 0, color: '#1890ff' }}></h2>
          <Space>
            <LanguageSwitcher />
            <Dropdown
              menu={{ items: userMenuItems }}
              placement="bottomRight"
            >
              <Button type="text" icon={<UserOutlined />}>
                {user.username} ({getUserRoleLabel()})
              </Button>
            </Dropdown>
          </Space>
        </Header>

        <Content style={{
          margin: '24px',
          padding: '24px',
          background: '#fff',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden'
        }}>
          {children}
        </Content>
      </Layout>

      {/* 聊天组件 */}
      <ChatWidget />
    </Layout>
  )
}
