'use client'

import { useEffect, useState } from 'react'
import { Layout, Menu, Button, Dropdown, Space, Badge } from 'antd'
import { UserOutlined, LogoutOutlined, TeamOutlined, UserAddOutlined, HomeOutlined, FileTextOutlined, CheckCircleOutlined, BankOutlined, CheckSquareOutlined, AlertOutlined, BellOutlined } from '@ant-design/icons'
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
  const [pendingFeedbackCount, setPendingFeedbackCount] = useState(0)
  const [questionNotifications, setQuestionNotifications] = useState<Array<{
    id: string
    work_order_id: string
    work_order_name: string
    question_content: string
    responder_name: string
    created_at: string
  }>>([])
  const tQA = useTranslations('WorkOrderQA')

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  // 获取待处理反馈数量
  useEffect(() => {
    const fetchPendingCount = async () => {
      if (!user) return
      try {
        const { supabase } = await import('@/lib/supabase')
        let query = supabase
          .from('feedbacks')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending')

        // 中方员工只看自己需要处理的
        if (user.country === '中国' && user.role !== 'admin') {
          query = query.eq('handler_id', user.id)
        }
        // 日方员工只看自己提交的
        if (user.country === '日本' && user.role !== 'admin') {
          query = query.eq('submitter_id', user.id)
        }

        const { count } = await query
        setPendingFeedbackCount(count || 0)
      } catch (error) {
        console.error('获取待处理反馈数量失败:', error)
      }
    }
    fetchPendingCount()
    // 每30秒刷新一次
    const interval = setInterval(fetchPendingCount, 30000)
    return () => clearInterval(interval)
  }, [user])

  // 获取问题回复通知（中方员工查看自己提问的未读回复）
  useEffect(() => {
    const fetchQuestionNotifications = async () => {
      if (!user || user.country !== '中国') return
      try {
        const { supabase } = await import('@/lib/supabase')

        // 获取我提问的问题
        const { data: questions, error: questionsError } = await supabase
          .from('work_order_questions')
          .select('id, work_order_id, content')
          .eq('asker_id', user.id)

        if (questionsError) throw questionsError
        if (!questions || questions.length === 0) {
          setQuestionNotifications([])
          return
        }

        // 获取这些问题的未读回复
        const questionIds = questions.map(q => q.id)
        const { data: answers, error: answersError } = await supabase
          .from('work_order_answers')
          .select('id, question_id, responder_name, created_at, is_read')
          .in('question_id', questionIds)
          .eq('is_read', false) // 只获取未读回复
          .order('created_at', { ascending: false })
          .limit(10)

        if (answersError) throw answersError
        if (!answers || answers.length === 0) {
          setQuestionNotifications([])
          return
        }

        // 获取工单名称
        const workOrderIds = [...new Set(questions.map(q => q.work_order_id))]
        const { data: workOrders } = await supabase
          .from('work_orders')
          .select('id, name')
          .in('id', workOrderIds)

        const workOrderMap: Record<string, string> = {}
        workOrders?.forEach(wo => {
          workOrderMap[wo.id] = wo.name
        })

        // 创建问题ID到问题的映射
        const questionMap: Record<string, { work_order_id: string, content: string }> = {}
        questions.forEach(q => {
          questionMap[q.id] = { work_order_id: q.work_order_id, content: q.content }
        })

        // 组装通知数据（基于未读回复）
        const notifications = answers.map(a => {
          const question = questionMap[a.question_id]
          return {
            id: a.id, // 使用回复ID
            work_order_id: question?.work_order_id || '',
            work_order_name: workOrderMap[question?.work_order_id || ''] || '',
            question_content: question?.content.substring(0, 50) + ((question?.content.length || 0) > 50 ? '...' : '') || '',
            responder_name: a.responder_name,
            created_at: a.created_at
          }
        }).filter(n => n.work_order_id)

        setQuestionNotifications(notifications)
      } catch (error) {
        console.error('获取问题通知失败:', error)
      }
    }

    fetchQuestionNotifications()
    const interval = setInterval(fetchQuestionNotifications, 30000)
    return () => clearInterval(interval)
  }, [user])

  // 标记回复为已读
  const markNotificationAsRead = async (answerId: string, workOrderId: string) => {
    try {
      const { supabase } = await import('@/lib/supabase')
      await supabase
        .from('work_order_answers')
        .update({ is_read: true })
        .eq('id', answerId)

      // 立即从本地状态移除该通知
      setQuestionNotifications(prev => prev.filter(n => n.id !== answerId))

      // 跳转到工单详情页
      router.push(`/work-orders/${workOrderId}`)
    } catch (error) {
      console.error('标记已读失败:', error)
      // 即使标记失败也跳转
      router.push(`/work-orders/${workOrderId}`)
    }
  }

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
          key: 'customers/contract',
          icon: <TeamOutlined />,
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
    ...(canAccessTickets ? [{
      key: 'feedback-center',
      icon: <Badge count={pendingFeedbackCount} size="small" offset={[-5, 5]}><AlertOutlined /></Badge>,
      label: <Link href="/feedback-center">{t('menu.feedbackCenter')}</Link>,
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
            {/* 问题回复通知 - 仅中方员工显示 */}
            {user?.country === '中国' && (
              <Dropdown
                menu={{
                  items: questionNotifications.length > 0 ? [
                    ...questionNotifications.map((n, index) => ({
                      key: n.id,
                      label: (
                        <div
                          style={{ maxWidth: 300, cursor: 'pointer' }}
                          onClick={() => markNotificationAsRead(n.id, n.work_order_id)}
                        >
                          <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                            {tQA('notifications.newReply')}
                          </div>
                          <div style={{ fontSize: 12, color: '#666' }}>
                            {n.work_order_name} - {n.responder_name} {tQA('replied')}
                          </div>
                          <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                            {n.question_content}
                          </div>
                        </div>
                      )
                    })),
                    { type: 'divider' as const },
                    {
                      key: 'view-all',
                      label: tQA('notifications.viewDetail'),
                      onClick: () => router.push('/work-orders')
                    }
                  ] : [
                    {
                      key: 'empty',
                      label: tQA('notifications.noNotifications'),
                      disabled: true
                    }
                  ]
                }}
                placement="bottomRight"
                trigger={['click']}
              >
                <Badge count={questionNotifications.length} size="small">
                  <Button type="text" icon={<BellOutlined />}>
                    {tQA('notifications.title')}
                  </Button>
                </Badge>
              </Dropdown>
            )}
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
