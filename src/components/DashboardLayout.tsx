'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Layout, Menu, Button, Dropdown } from 'antd'
import { UserOutlined, LogoutOutlined, TeamOutlined, UserAddOutlined, HomeOutlined } from '@ant-design/icons'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'

const { Header, Sider, Content } = Layout

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout, isAdmin } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

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
    return <div>加载中...</div>
  }

  // 如果未登录且不是登录页面，重定向到登录页
  if (!user) {
    return <div>加载中...</div>
  }

  const menuItems = [
    {
      key: 'dashboard',
      icon: <HomeOutlined />,
      label: <Link href="/dashboard">仪表板</Link>,
    },
    {
      key: 'customers',
      icon: <TeamOutlined />,
      label: <Link href="/customers">客户管理</Link>,
    },
    ...(isAdmin ? [{
      key: 'users',
      icon: <UserAddOutlined />,
      label: <Link href="/users">账号管理</Link>,
    }] : [])
  ]

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: logout,
    },
  ]

  // 获取当前选中的菜单项
  const getSelectedKey = () => {
    if (pathname === '/dashboard') return ['dashboard']
    if (pathname === '/customers') return ['customers']
    if (pathname === '/users') return ['users']
    return ['dashboard']
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={200} theme="dark" collapsible={false}>
        <div style={{ 
          height: '64px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: 'white',
          fontSize: '18px',
          fontWeight: 'bold'
        }}>
          客户跟踪管理系统
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={getSelectedKey()}
          items={menuItems}
          style={{ width: '100%' }}
        />
      </Sider>
      
      <Layout>
        <Header style={{ 
          background: '#fff', 
          padding: '0 24px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ margin: 0, color: '#1890ff' }}></h2>
          <Dropdown
            menu={{ items: userMenuItems }}
            placement="bottomRight"
          >
            <Button type="text" icon={<UserOutlined />}>
              {user.username} ({user.role === 'admin' ? '管理员' : '员工'})
            </Button>
          </Dropdown>
        </Header>
        
        <Content style={{ 
          margin: '24px', 
          padding: '24px', 
          background: '#fff',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}
