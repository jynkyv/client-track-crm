'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, Statistic, Row, Col, Table, Tag, Tooltip } from 'antd'
import { TeamOutlined, EyeOutlined } from '@ant-design/icons'
import { supabase, Customer } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslations } from 'next-intl'

export default function DashboardPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const { isAdmin, user } = useAuth()
  const t = useTranslations('Dashboard')
  const tCommon = useTranslations('Common')

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

      // 如果是员工，只获取自己的客户
      if (!isAdmin && user?.username) {
        query = query.eq('owner', user.username)
      }
      // 管理员可以看到所有客户

      const { data, error } = await query

      if (error) throw error
      setCustomers(data || [])
    } catch (error) {
      console.error('获取客户数据失败:', error)
    } finally {
      setLoading(false)
    }
  }, [isAdmin, user])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  const getIntentionColor = (intention: string) => {
    switch (intention) {
      case '高': return 'red'
      case '中': return 'orange'
      case '低': return 'green'
      default: return 'blue'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'communicating': return 'green'
      case 'closed': return 'default'
      case 'rejected': return 'red'
      default: return 'blue'
    }
  }

  const recentCustomersColumns = [
    {
      title: t('columns.nickname'),
      dataIndex: 'nickname',
      key: 'nickname',
      align: 'center' as const,
    },
    {
      title: t('columns.contact'),
      dataIndex: 'contact',
      key: 'contact',
      align: 'center' as const,
    },
    {
      title: t('columns.intention'),
      dataIndex: 'intention',
      key: 'intention',
      align: 'center' as const,
      sorter: (a: Customer, b: Customer) => {
        const intentionOrder = { '高': 3, '中': 2, '低': 1 }
        const aOrder = intentionOrder[a.intention as keyof typeof intentionOrder] || 0
        const bOrder = intentionOrder[b.intention as keyof typeof intentionOrder] || 0
        return aOrder - bOrder
      },
      render: (intention: string) => (
        <Tag color={getIntentionColor(intention)}>
          {intention}
        </Tag>
      ),
    },
    {
      title: t('columns.status'),
      dataIndex: 'status',
      key: 'status',
      align: 'center' as const,
      render: (status: string) => {
        const statusText = {
          communicating: t('status.communicating'),
          closed: t('status.closed'),
          rejected: t('status.rejected')
        }
        return (
          <Tag color={getStatusColor(status)}>
            {statusText[status as keyof typeof statusText] || status}
          </Tag>
        )
      },
    },
    {
      title: t('columns.age'),
      dataIndex: 'age',
      key: 'age',
      align: 'center' as const,
      sorter: (a: Customer, b: Customer) => {
        const aAge = a.age || 0
        const bAge = b.age || 0
        return aAge - bAge
      },
      render: (age: number) => age ? `${age}${tCommon('ageUnit')}` : '-',
    },
    {
      title: t('columns.gender'),
      dataIndex: 'gender',
      key: 'gender',
      align: 'center' as const,
      render: (gender: string) => {
        if (!gender) return '-'
        const genderText = {
          male: tCommon('gender.male'),
          female: tCommon('gender.female'),
          other: tCommon('gender.other')
        }
        return genderText[gender as keyof typeof genderText] || gender
      },
    },
    {
      title: t('columns.workExperience'),
      width: 100,
      dataIndex: 'work_experience',
      key: 'work_experience',
      align: 'center' as const,
      render: (work_experience: string) => {
        if (!work_experience) return '-'
        const displayText = work_experience.length > 6 ? `${work_experience.substring(0, 6)}...` : work_experience
        return (
          <Tooltip title={work_experience} placement="topLeft">
            <span style={{ cursor: 'help', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayText}</span>
          </Tooltip>
        )
      },
    },
    {
      title: t('columns.notes'),
      width: 100,
      dataIndex: 'notes',
      key: 'notes',
      align: 'center' as const,
      render: (notes: string) => {
        if (!notes) return '-'
        const displayText = notes.length > 6 ? `${notes.substring(0, 6)}...` : notes
        return (
          <Tooltip title={notes} placement="topLeft">
            <span style={{ cursor: 'help', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayText}</span>
          </Tooltip>
        )
      },
    },
    ...(isAdmin ? [{
      title: t('columns.owner'),
      dataIndex: 'owner',
      key: 'owner',
      align: 'center' as const,
      render: (owner: string) => owner || '-',
    }] : []),
    {
      title: t('columns.followUps'),
      dataIndex: 'follow_ups',
      key: 'follow_ups',
      align: 'center' as const,
      sorter: (a: Customer, b: Customer) => {
        const aCount = a.follow_ups?.length || 0
        const bCount = b.follow_ups?.length || 0
        return aCount - bCount
      },
      render: (followUps: unknown[]) => followUps?.length || 0,
    },
  ]

  return (
    <div>
      <h1 style={{ marginBottom: '24px' }}>{t('menu.dashboard')}</h1>

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title={t('stats.totalCustomers')}
              value={customers.length}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={t('stats.communicating')}
              value={customers.filter(c => c.status === 'communicating').length}
              prefix={<EyeOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={t('stats.closed')}
              value={customers.filter(c => c.status === 'closed').length}
              prefix={<EyeOutlined />}
              valueStyle={{ color: '#8c8c8c' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={t('stats.rejected')}
              value={customers.filter(c => c.status === 'rejected').length}
              prefix={<EyeOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title={t('recentActivities')} loading={loading}>
        <Table
          columns={recentCustomersColumns}
          dataSource={customers}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Card>

    </div>
  )
}
