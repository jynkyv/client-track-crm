'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Table, 
  Button, 
  Form, 
  Input, 
  Select, 
  Space, 
  message,
  Card,
  Tag,
  Timeline,
  Dropdown,
  Tooltip,
  Drawer,
  Row,
  Col,
  InputNumber,
  TableProps,
  DatePicker
} from 'antd'
import { MoreOutlined, DollarOutlined, SwapOutlined, EyeOutlined, DeleteOutlined } from '@ant-design/icons'
import { supabase, Customer, Payment } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'

const { Option } = Select

// 格式化金额，添加千分号
const formatAmount = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return '0'
  return amount.toLocaleString('zh-CN')
}

export default function ContractCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [statusDrawerVisible, setStatusDrawerVisible] = useState(false)
  const [paymentDrawerVisible, setPaymentDrawerVisible] = useState(false)
  const [paymentHistoryDrawerVisible, setPaymentHistoryDrawerVisible] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [statusForm] = Form.useForm()
  const [paymentForm] = Form.useForm()
  const { isAdmin, user } = useAuth()

  // 筛选和搜索状态
  const [searchName, setSearchName] = useState('')
  const [stage2StatusFilter, setStage2StatusFilter] = useState<string>('')
  const [ownerFilter, setOwnerFilter] = useState<string>('')

  // 用户列表状态
  const [users, setUsers] = useState<Array<{username: string}>>([])

  // 分页和排序状态
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [sortField, setSortField] = useState<string>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // 获取用户列表（仅管理员需要）
  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('username')
        .order('username')

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('获取用户列表失败:', error)
    }
  }, [isAdmin])

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    try {
      // 构建基础查询 - 只显示正式客户（status = 'closed'）
      let query = supabase
        .from('customers')
        .select('*', { count: 'exact' })
        .eq('status', 'closed')

      // 如果是员工，只获取自己的客户
      if (!isAdmin && user?.username) {
        query = query.eq('owner', user.username)
      }

      // 应用筛选条件
      if (searchName) {
        query = query.ilike('real_name', `%${searchName}%`)
      }
      
      if (stage2StatusFilter) {
        query = query.eq('stage2_status', stage2StatusFilter)
      }

      // 所属人筛选（仅管理员可用）
      if (ownerFilter) {
        query = query.eq('owner', ownerFilter)
      }

      // 应用排序
      query = query.order(sortField, { ascending: sortOrder === 'asc' })

      // 应用分页
      const from = (currentPage - 1) * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) throw error
      setCustomers(data || [])
      setTotal(count || 0)
    } catch {
      message.error('获取客户列表失败')
    } finally {
      setLoading(false)
    }
  }, [isAdmin, user, searchName, stage2StatusFilter, ownerFilter, currentPage, pageSize, sortField, sortOrder])

  // 获取付款记录
  const fetchPayments = useCallback(async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('customer_id', customerId)
        .order('payment_time', { ascending: false })

      if (error) {
        console.error('获取付款记录错误:', error)
        // 如果是表不存在的错误
        if (error.code === 'PGRST204' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
          message.error('payments表不存在，请先在Supabase执行 update-database-stage2.sql 脚本创建表')
        } else {
          message.error(`获取付款记录失败: ${error.message}`)
        }
        setPayments([])
        return
      }
      setPayments(data || [])
    } catch (error: any) {
      console.error('获取付款记录异常:', error)
      message.error(`获取付款记录失败: ${error?.message || '未知错误'}`)
      setPayments([])
    }
  }, [])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // 处理分页变化
  const handleTableChange: TableProps<Customer>['onChange'] = (pagination, filters, sorter) => {
    if (pagination) {
      setCurrentPage(pagination.current || 1)
      setPageSize(pagination.pageSize || 10)
    }
    
    if (sorter && !Array.isArray(sorter) && sorter.field) {
      setSortField(String(sorter.field))
      setSortOrder(sorter.order === 'ascend' ? 'asc' : 'desc')
    }
  }

  // 处理状态变更
  const handleStatusChange = (record: Customer) => {
    setSelectedCustomer(record)
    statusForm.setFieldsValue({
      stage2_status: record.stage2_status || '待面试',
      interview_notice_time: record.interview_notice_time ? dayjs(record.interview_notice_time) : null
    })
    setStatusDrawerVisible(true)
  }

  const handleStatusSubmit = async (values: {
    stage2_status: string
    interview_notice_time?: Dayjs
  }) => {
    if (!selectedCustomer) return

    try {
      const updateData: any = {
        stage2_status: values.stage2_status
      }

      // 如果是"已通知面试"，需要填写时间
      if (values.stage2_status === '已通知面试') {
        if (!values.interview_notice_time) {
          message.error('已通知面试必须填写通知时间')
          return
        }
        updateData.interview_notice_time = values.interview_notice_time.toISOString()
      } else {
        // 其他状态清空面试通知时间
        updateData.interview_notice_time = null
      }

      const { error } = await supabase
        .from('customers')
        .update(updateData)
        .eq('id', selectedCustomer.id)

      if (error) throw error
      message.success('状态更新成功')
      setStatusDrawerVisible(false)
      fetchCustomers()
    } catch {
      message.error('状态更新失败')
    }
  }

  // 处理删除
  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id)

      if (error) throw error
      message.success('删除成功')
      fetchCustomers()
    } catch {
      message.error('删除失败')
    }
  }

  // 处理付款
  const handlePayment = (record: Customer) => {
    setSelectedCustomer(record)
    paymentForm.resetFields()
    paymentForm.setFieldsValue({
      payment_time: dayjs()
    })
    setPaymentDrawerVisible(true)
  }

  const handlePaymentSubmit = async (values: {
    amount: number
    payment_name?: string
    payment_time: Dayjs
    notes?: string
  }) => {
    if (!selectedCustomer) return

    try {
      // 插入付款记录
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .insert([{
          customer_id: selectedCustomer.id,
          amount: values.amount,
          payment_name: values.payment_name,
          payment_time: values.payment_time.toISOString(),
          notes: values.notes,
          created_by: user?.username || 'employee'
        }])
        .select()
        .single()

      if (paymentError) {
        console.error('插入付款记录错误:', paymentError)
        // 如果是表不存在的错误
        if (paymentError.code === 'PGRST204' || paymentError.message?.includes('relation') || paymentError.message?.includes('does not exist')) {
          message.error('payments表不存在，请先在Supabase执行 update-database-stage2.sql 脚本创建表')
        } else {
          message.error(`添加付款记录失败: ${paymentError.message}`)
        }
        return
      }

      // 更新客户钱包余额和最后付款时间
      const newBalance = (selectedCustomer.wallet_balance || 0) + values.amount
      const { error: updateError } = await supabase
        .from('customers')
        .update({
          wallet_balance: newBalance,
          last_payment_time: values.payment_time.toISOString()
        })
        .eq('id', selectedCustomer.id)

      if (updateError) throw updateError

      message.success('付款记录添加成功')
      setPaymentDrawerVisible(false)
      fetchCustomers()
    } catch {
      message.error('添加付款记录失败')
    }
  }

  // 查看付款历史
  const handleViewPaymentHistory = async (record: Customer) => {
    setSelectedCustomer(record)
    await fetchPayments(record.id)
    setPaymentHistoryDrawerVisible(true)
  }

  // 计算钱包余额（从付款记录累加）
  const calculateWalletBalance = useCallback((customerId: string, payments: Payment[]) => {
    return payments.reduce((sum, payment) => sum + payment.amount, 0)
  }, [])

  const columns = [
    {
      title: '真实姓名',
      width: 100,
      dataIndex: 'real_name',
      key: 'real_name',
      align: 'center' as const,
      render: (name: string) => name || '-',
    },
    {
      title: '客户状态',
      width: 120,
      dataIndex: 'stage2_status',
      key: 'stage2_status',
      align: 'center' as const,
      render: (status: string, record: Customer) => {
        const statusConfig: Record<string, { color: string; text: string }> = {
          '待面试': { color: 'blue', text: '待面试' },
          '已通知面试': { color: 'orange', text: '已通知面试' },
          '面试通过': { color: 'green', text: '面试通过' },
          '面试失败': { color: 'red', text: '面试失败' },
          '培训中': { color: 'purple', text: '培训中' },
          '已完成': { color: 'default', text: '已完成' }
        }
        const config = statusConfig[status] || { color: 'default', text: status || '-' }
        
        // 如果是"已通知面试"且有面试时间，在Tag内显示时间
        if (status === '已通知面试' && record.interview_notice_time) {
          const interviewTime = new Date(record.interview_notice_time)
          const formattedTime = interviewTime.toLocaleString('zh-CN', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          })
          return (
            <Tag color={config.color} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 8px' }}>
              <div>{config.text}</div>
              <div style={{ fontSize: '11px', marginTop: '2px', opacity: 0.9 }}>{formattedTime}</div>
            </Tag>
          )
        }
        
        return <Tag color={config.color}>{config.text}</Tag>
      },
    },
    {
      title: '年龄',
      width: 80,
      dataIndex: 'age',
      key: 'age',
      align: 'center' as const,
      render: (age: number) => age ? `${age}岁` : '-',
    },
    {
      title: '性别',
      width: 60,
      dataIndex: 'gender',
      key: 'gender',
      align: 'center' as const,
      render: (gender: string) => {
        if (!gender) return '-'
        const genderText = {
          male: '男',
          female: '女',
          other: '其他'
        }
        return genderText[gender as keyof typeof genderText] || gender
      },
    },
    {
      title: '电话',
      width: 120,
      dataIndex: 'phone',
      key: 'phone',
      align: 'center' as const,
      render: (phone: string) => phone || '-',
    },
    {
      title: '联系方式',
      width: 120,
      dataIndex: 'contact',
      key: 'contact',
      align: 'center' as const,
    },
    {
      title: '意向企业/行业',
      width: 150,
      dataIndex: 'target_company',
      key: 'target_company',
      align: 'center' as const,
      render: (target_company: string) => {
        if (!target_company) return '-'
        const displayText = target_company.length > 10 ? `${target_company.substring(0, 10)}...` : target_company
        return (
          <Tooltip title={target_company} placement="topLeft">
            <span style={{ cursor: 'help', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayText}</span>
          </Tooltip>
        )
      },
    },
    {
      title: '工作经验',
      width: 100,
      dataIndex: 'work_experience',
      key: 'work_experience',
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
      title: '备注',
      width: 100,
      dataIndex: 'notes',
      key: 'notes',
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
      title: '所属人',
      width: 90,
      dataIndex: 'owner',
      key: 'owner',
      align: 'center' as const,
      render: (owner: string) => owner || '-',
    }] : []),
    {
      title: '汇款金额',
      width: 150,
      dataIndex: 'wallet_balance',
      key: 'wallet_balance',
      align: 'center' as const,
      render: (balance: number, record: Customer) => {
        const currentBalance = balance || 0
        const walletLimit = 30000
        return (
          <Button 
            type="link" 
            onClick={() => handleViewPaymentHistory(record)}
            style={{ padding: 0, fontWeight: 'bold', color: currentBalance > 0 ? '#52c41a' : '#999' }}
          >
            ¥{formatAmount(currentBalance)}/{formatAmount(walletLimit)}
          </Button>
        )
      },
    },
    {
      title: '创建时间',
      width: 100,
      dataIndex: 'created_at',
      key: 'created_at',
      align: 'center' as const,
      sorter: true,
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: '最后汇款时间',
      width: 120,
      dataIndex: 'last_payment_time',
      key: 'last_payment_time',
      align: 'center' as const,
      render: (date: string) => date ? new Date(date).toLocaleDateString() : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 20,
      align: 'center' as const,
      render: (_: unknown, record: Customer) => {
        const menuItems = [
          {
            key: 'status',
            label: '状态变更',
            icon: <SwapOutlined />,
            onClick: () => handleStatusChange(record)
          },
          {
            key: 'payment',
            label: '付款/退款',
            icon: <DollarOutlined />,
            onClick: () => handlePayment(record)
          }
        ]
        
        // 在admin身份下添加删除选项
        if (isAdmin) {
          menuItems.push({
            key: 'delete',
            label: '删除',
            icon: <DeleteOutlined />,
            onClick: () => handleDelete(record.id)
          })
        }
        
        const menu = {
          items: menuItems
        }
        
        return (
          <Dropdown menu={menu} trigger={['click']}>
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        )
      },
    },
  ]

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>正式客户管理</h2>
        </div>

        {/* 筛选和搜索区域 */}
        <Card style={{ marginBottom: 16 }}>
          <h3 style={{ marginBottom: 16 }}>筛选和搜索</h3>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>真实姓名搜索</label>
                <Input
                  placeholder="搜索真实姓名"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  allowClear
                />
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>状态筛选</label>
                <Select
                  placeholder="筛选状态"
                  value={stage2StatusFilter}
                  onChange={setStage2StatusFilter}
                  allowClear
                  style={{ width: '100%' }}
                >
                  <Option value="待面试">待面试</Option>
                  <Option value="已通知面试">已通知面试</Option>
                  <Option value="面试通过">面试通过</Option>
                  <Option value="面试失败">面试失败</Option>
                  <Option value="培训中">培训中</Option>
                  <Option value="已完成">已完成</Option>
                </Select>
              </div>
            </Col>
            {isAdmin && (
              <Col xs={24} sm={12} md={6}>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>所属人筛选</label>
                  <Select
                    placeholder="筛选所属人"
                    value={ownerFilter}
                    onChange={setOwnerFilter}
                    allowClear
                    style={{ width: '100%' }}
                  >
                    {users.map(user => (
                      <Option key={user.username} value={user.username}>
                        {user.username}
                      </Option>
                    ))}
                  </Select>
                </div>
              </Col>
            )}
          </Row>
          <Row style={{ marginTop: 16 }}>
            <Col span={24}>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button onClick={() => {
                  setSearchName('')
                  setStage2StatusFilter('')
                  setOwnerFilter('')
                  setCurrentPage(1)
                  setSortField('created_at')
                  setSortOrder('desc')
                }}>
                  重置筛选
                </Button>
              </div>
            </Col>
          </Row>
        </Card>

        <Table
          columns={columns}
          dataSource={customers}
          loading={loading}
          rowKey="id"
          onChange={handleTableChange}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </Card>

      {/* 状态变更Drawer */}
      <Drawer
        title={`状态变更 - ${selectedCustomer?.real_name || selectedCustomer?.nickname}`}
        open={statusDrawerVisible}
        onClose={() => setStatusDrawerVisible(false)}
        width={600}
        placement="right"
      >
        <Form
          form={statusForm}
          layout="vertical"
          onFinish={handleStatusSubmit}
        >
          <Form.Item
            name="stage2_status"
            label="客户状态"
            rules={[{ required: true, message: '请选择客户状态' }]}
          >
            <Select placeholder="请选择客户状态">
              <Option value="待面试">待面试</Option>
              <Option value="已通知面试">已通知面试</Option>
              <Option value="面试通过">面试通过</Option>
              <Option value="面试失败">面试失败</Option>
              <Option value="培训中">培训中</Option>
              <Option value="已完成">已完成</Option>
            </Select>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.stage2_status !== currentValues.stage2_status}
          >
            {({ getFieldValue }) => {
              const status = getFieldValue('stage2_status')
              return status === '已通知面试' ? (
                <Form.Item
                  name="interview_notice_time"
                  label="面试通知时间"
                  rules={[{ required: true, message: '已通知面试必须填写通知时间' }]}
                >
                  <DatePicker
                    showTime
                    style={{ width: '100%' }}
                    placeholder="请选择面试通知时间"
                  />
                </Form.Item>
              ) : null
            }}
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                确认变更
              </Button>
              <Button onClick={() => setStatusDrawerVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Drawer>

      {/* 付款Drawer */}
      <Drawer
        title={`付款/退款 - ${selectedCustomer?.real_name || selectedCustomer?.nickname}`}
        open={paymentDrawerVisible}
        onClose={() => setPaymentDrawerVisible(false)}
        width={600}
        placement="right"
      >
        <Form
          form={paymentForm}
          layout="vertical"
          onFinish={handlePaymentSubmit}
        >
          <Form.Item
            name="amount"
            label="金额（支持负数表示退款）"
            rules={[{ required: true, message: '请输入金额' }]}
          >
            <InputNumber
              placeholder="请输入金额，负数表示退款"
              style={{ width: '100%' }}
              addonAfter="元"
            />
          </Form.Item>

          <Form.Item
            name="payment_name"
            label="款项名称"
          >
            <Input placeholder="请输入款项名称（如：面试意向金）" />
          </Form.Item>

          <Form.Item
            name="payment_time"
            label="付款时间"
            rules={[{ required: true, message: '请选择付款时间' }]}
          >
            <DatePicker
              showTime
              style={{ width: '100%' }}
              placeholder="请选择付款时间"
            />
          </Form.Item>

          <Form.Item
            name="notes"
            label="备注"
          >
            <Input.TextArea rows={3} placeholder="请输入备注信息" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                确认
              </Button>
              <Button onClick={() => setPaymentDrawerVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Drawer>

      {/* 付款历史Drawer */}
      <Drawer
        title={`汇款历史 - ${selectedCustomer?.real_name || selectedCustomer?.nickname}`}
        open={paymentHistoryDrawerVisible}
        onClose={() => setPaymentHistoryDrawerVisible(false)}
        width={600}
        placement="right"
        styles={{
          body: {
            padding: '24px',
            overflowY: 'auto'
          }
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <h4 style={{ margin: 0 }}>当前余额：¥{formatAmount(selectedCustomer?.wallet_balance)} / ¥{formatAmount(30000)}</h4>
        </div>
        {payments.length > 0 ? (
          <Timeline
            items={payments.map((payment) => ({
              key: payment.id,
              color: payment.amount >= 0 ? 'green' : 'red',
              children: (
                <div style={{ 
                  padding: '12px',
                  marginBottom: '12px',
                  backgroundColor: '#fafafa',
                  borderRadius: '4px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <strong style={{ color: payment.amount >= 0 ? '#52c41a' : '#ff4d4f', fontSize: '16px' }}>
                      {payment.amount >= 0 ? '+' : ''}¥{formatAmount(payment.amount)}
                    </strong>
                    <span style={{ color: '#666', fontSize: '12px' }}>
                      {new Date(payment.payment_time).toLocaleString()}
                    </span>
                  </div>
                  {payment.payment_name && (
                    <div style={{ marginBottom: '4px', color: '#1890ff', fontWeight: 500 }}>
                      {payment.payment_name}
                    </div>
                  )}
                  {payment.notes && (
                    <p style={{ margin: 0, lineHeight: '1.5', color: '#666' }}>{payment.notes}</p>
                  )}
                  <div style={{ marginTop: '4px', fontSize: '12px', color: '#999' }}>
                    操作人：{payment.created_by}
                  </div>
                </div>
              )
            }))}
          />
        ) : (
          <div style={{ 
            textAlign: 'center', 
            color: '#999', 
            padding: '40px 0'
          }}>
            暂无付款记录
          </div>
        )}
      </Drawer>
    </div>
  )
}

