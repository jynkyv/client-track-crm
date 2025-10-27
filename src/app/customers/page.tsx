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
  TableProps
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, MoreOutlined, SearchOutlined, FilterOutlined } from '@ant-design/icons'
import { supabase, Customer, FollowUp } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

const { Option } = Select

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [followUpDrawerVisible, setFollowUpDrawerVisible] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [form] = Form.useForm()
  const [followUpForm] = Form.useForm()
  const { isAdmin, user } = useAuth()

  // 筛选和搜索状态
  const [searchName, setSearchName] = useState('')
  const [minAge, setMinAge] = useState<number | null>(null)
  const [maxAge, setMaxAge] = useState<number | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [intentionFilter, setIntentionFilter] = useState<string>('')

  // 分页和排序状态
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [sortField, setSortField] = useState<string>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    try {
      // 构建基础查询
      let query = supabase
        .from('customers')
        .select('*', { count: 'exact' })

      // 如果是员工，只获取自己的客户
      if (!isAdmin && user?.username) {
        query = query.eq('owner', user.username)
      }

      // 应用筛选条件
      if (searchName) {
        query = query.ilike('nickname', `%${searchName}%`)
      }
      
      if (statusFilter) {
        query = query.eq('status', statusFilter)
      }
      
      if (intentionFilter) {
        query = query.eq('intention', intentionFilter)
      }

      // 年龄范围筛选
      if (minAge !== null && minAge > 0) {
        query = query.gte('age', minAge)
      }
      if (maxAge !== null && maxAge < 100) {
        query = query.lte('age', maxAge)
      }

      // 应用排序
      query = query.order(sortField, { ascending: sortOrder === 'asc' })

      // 应用分页 - Supabase使用range(from, to)语法
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
  }, [isAdmin, user, searchName, statusFilter, intentionFilter, minAge, maxAge, currentPage, pageSize, sortField, sortOrder])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

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


  const handleAdd = () => {
    setEditingCustomer(null)
    form.resetFields()
    setDrawerVisible(true)
  }

  const handleEdit = (record: Customer) => {
    setEditingCustomer(record)
    form.setFieldsValue(record)
    setDrawerVisible(true)
  }

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

  // 状态快捷切换
  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('customers')
        .update({ status: newStatus })
        .eq('id', id)

      if (error) throw error
      message.success('状态更新成功')
      fetchCustomers()
    } catch {
      message.error('状态更新失败')
    }
  }

  const handleSubmit = async (values: Customer) => {
    try {
      // 自动设置所属人为当前用户
      const submitValues = {
        ...values,
        owner: user?.username || 'employee'
      }

      if (editingCustomer) {
        const { error } = await supabase
          .from('customers')
          .update(submitValues)
          .eq('id', editingCustomer.id)

        if (error) throw error
        message.success('更新成功')
      } else {
        const { error } = await supabase
          .from('customers')
          .insert([submitValues])

        if (error) throw error
        message.success('添加成功')
      }
      setDrawerVisible(false)
      fetchCustomers()
    } catch {
      message.error('操作失败')
    }
  }

  const handleAddFollowUp = (record: Customer) => {
    setSelectedCustomer(record)
    followUpForm.resetFields()
    setFollowUpDrawerVisible(true)
  }

  const handleFollowUpSubmit = async (values: { content: string }) => {
    if (!selectedCustomer) return

    try {
      const newFollowUp: FollowUp = {
        id: Date.now().toString(),
        time: new Date().toISOString(),
        content: values.content
      }

      const updatedFollowUps = [...selectedCustomer.follow_ups, newFollowUp]

      const { error } = await supabase
        .from('customers')
        .update({ follow_ups: updatedFollowUps })
        .eq('id', selectedCustomer.id)

      if (error) throw error
      message.success('跟进记录添加成功')
      setFollowUpDrawerVisible(false)
      fetchCustomers()
    } catch {
      message.error('添加跟进记录失败')
    }
  }

  const columns = [
    {
      title: '客户昵称',
      width: 90,
      dataIndex: 'nickname',
      key: 'nickname',
      align: 'center' as const,
    },
    {
      title: '来源',
      width: 90,
      dataIndex: 'source',
      key: 'source',
      align: 'center' as const,
    },
    {
      title: '意向度',
      width: 80,
      dataIndex: 'intention',
      key: 'intention',
      align: 'center' as const,
      sorter: true,
      render: (intention: string) => (
        <Tag color={intention === '高' ? 'red' : intention === '中' ? 'orange' : 'green'}>
          {intention}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 20,
      align: 'center' as const,
      render: (status: string) => {
        const statusConfig = {
          communicating: { color: 'green', text: '沟通中' },
          closed: { color: 'default', text: '已成交' },
          rejected: { color: 'red', text: '已拒绝' }
        }
        const config = statusConfig[status as keyof typeof statusConfig] || { color: 'default', text: status }
        return <Tag color={config.color}>{config.text}</Tag>
      },
    },
    {
      title: '年龄',
      width: 80,
      dataIndex: 'age',
      key: 'age',
      align: 'center' as const,
      sorter: true,
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
      title: '联系方式',
      width: 120,
      dataIndex: 'contact',
      key: 'contact',
      align: 'center' as const,
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
      title: '跟进次数',
      dataIndex: 'follow_ups',
      key: 'follow_ups',
      width: 100,
      align: 'center' as const,
      sorter: true,
      render: (followUps: FollowUp[], record: Customer) => (
        <Button 
          type="link" 
          onClick={() => handleAddFollowUp(record)}
          style={{ padding: 0 }}
        >
          {followUps?.length || 0} 次
        </Button>
      ),
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
      title: '最后跟进时间',
      width: 150,
      dataIndex: 'follow_ups',
      key: 'last_follow_up',
      align: 'center' as const,
      sorter: true,
      render: (followUps: FollowUp[]) => {
        if (!followUps || followUps.length === 0) {
          return <span style={{ color: '#999' }}>暂无跟进</span>
        }
        const lastFollowUp = followUps[followUps.length - 1]
        return new Date(lastFollowUp.time).toLocaleDateString()
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 20,
      align: 'center' as const,
      render: (_: unknown, record: Customer) => {
        const menuItems = [
          {
            key: 'follow',
            label: '跟进',
            icon: <EyeOutlined />,
            onClick: () => handleAddFollowUp(record)
          },
          {
            key: 'status',
            label: '状态切换',
            icon: <FilterOutlined />,
            children: [
              {
                key: 'communicating',
                label: '沟通中',
                onClick: () => handleStatusChange(record.id, 'communicating')
              },
              {
                key: 'closed',
                label: '已成交',
                onClick: () => handleStatusChange(record.id, 'closed')
              },
              {
                key: 'rejected',
                label: '已拒绝',
                onClick: () => handleStatusChange(record.id, 'rejected')
              }
            ]
          }
        ]
        
        if (!isAdmin) {
          menuItems.push(
            {
              key: 'edit',
              label: '编辑',
              icon: <EditOutlined />,
              onClick: () => handleEdit(record)
            },
            {
              key: 'delete',
              label: '删除',
              icon: <DeleteOutlined />,
              onClick: () => handleDelete(record.id)
            }
          )
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
          <h2>客户管理</h2>
          {!isAdmin && (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              添加客户
            </Button>
          )}
        </div>

        {/* 筛选和搜索区域 */}
        <Card style={{ marginBottom: 16 }}>
          <h3 style={{ marginBottom: 16 }}>筛选和搜索</h3>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={3}>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>客户昵称搜索</label>
                <Input
                  placeholder="搜索客户昵称"
                  prefix={<SearchOutlined />}
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  allowClear
                />
              </div>
            </Col>
            <Col xs={24} sm={12} md={3}>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>状态筛选</label>
                <Select
                  placeholder="筛选状态"
                  value={statusFilter}
                  onChange={setStatusFilter}
                  allowClear
                  style={{ width: '100%' }}
                >
                  <Option value="communicating">沟通中</Option>
                  <Option value="closed">已成交</Option>
                  <Option value="rejected">已拒绝</Option>
                </Select>
              </div>
            </Col>
            <Col xs={24} sm={12} md={3}>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>意向度筛选</label>
                <Select
                  placeholder="筛选意向度"
                  value={intentionFilter}
                  onChange={setIntentionFilter}
                  allowClear
                  style={{ width: '100%' }}
                >
                  <Option value="高">高</Option>
                  <Option value="中">中</Option>
                  <Option value="低">低</Option>
                </Select>
              </div>
            </Col>
            <Col xs={24} sm={12} md={3}>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>年龄范围筛选</label>
                <Space style={{ width: '100%' }}>
                  <InputNumber
                    placeholder="最小年龄"
                    min={0}
                    max={100}
                    value={minAge}
                    onChange={setMinAge}
                    style={{ flex: 1 }}
                  />
                  <span>至</span>
                  <InputNumber
                    placeholder="最大年龄"
                    min={0}
                    max={100}
                    value={maxAge}
                    onChange={setMaxAge}
                    style={{ flex: 1 }}
                  />
                </Space>
              </div>
            </Col>
          </Row>
          <Row style={{ marginTop: 16 }}>
            <Col span={24}>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Space>
                  <Button onClick={() => {
                    setSearchName('')
                    setStatusFilter('')
                    setIntentionFilter('')
                    setMinAge(null)
                    setMaxAge(null)
                    setCurrentPage(1)
                    setSortField('created_at')
                    setSortOrder('desc')
                  }}>
                    重置筛选
                  </Button>
                </Space>
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

      <Drawer
        title={editingCustomer ? '编辑客户' : '添加客户'}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        width={600}
        placement="right"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="nickname"
                label="客户昵称"
                rules={[{ required: true, message: '请输入客户昵称' }]}
              >
                <Input placeholder="请输入客户昵称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="contact"
                label="联系方式"
                rules={[{ required: true, message: '请输入联系方式' }]}
              >
                <Input placeholder="请输入联系方式" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="source"
                label="来源"
                rules={[{ required: true, message: '请选择来源' }]}
              >
                <Select placeholder="请选择来源">
                  <Option value="线下推广">线下推广</Option>
                  <Option value="小红书">小红书</Option>
                  <Option value="抖音">抖音</Option>
                  <Option value="快手">快手</Option>
                  <Option value="其他渠道">其他渠道</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="intention"
                label="意向度"
                rules={[{ required: true, message: '请选择意向度' }]}
              >
                <Select placeholder="请选择意向度">
                  <Option value="高">高</Option>
                  <Option value="中">中</Option>
                  <Option value="低">低</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="status"
                label="状态"
                rules={[{ required: true, message: '请选择状态' }]}
                initialValue="communicating"
              >
                <Select placeholder="请选择状态">
                  <Option value="communicating">沟通中</Option>
                  <Option value="closed">已成交</Option>
                  <Option value="rejected">已拒绝</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="age"
                label="年龄"
              >
                <Input type="number" placeholder="请输入年龄" min={1} max={100} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="gender"
                label="性别"
              >
                <Select placeholder="请选择性别">
                  <Option value="male">男</Option>
                  <Option value="female">女</Option>
                  <Option value="other">其他</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              {/* 占位，保持布局对称 */}
            </Col>
          </Row>

          <Form.Item
            name="work_experience"
            label="工作经验"
          >
            <Input.TextArea rows={3} placeholder="请输入工作经验" />
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
                {editingCustomer ? '更新' : '添加'}
              </Button>
              <Button onClick={() => setDrawerVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Drawer>

      <Drawer
        title={`跟进记录 - ${selectedCustomer?.nickname}`}
        open={followUpDrawerVisible}
        onClose={() => setFollowUpDrawerVisible(false)}
        width={600}
        placement="right"
      >
        <div style={{ marginBottom: 16 }}>
          <h4>历史跟进记录：</h4>
          <div 
            style={{ 
              maxHeight: '400px', 
              overflowY: 'auto',
              border: '1px solid #f0f0f0',
              borderRadius: '6px',
              padding: '12px'
            }}
          >
            {selectedCustomer?.follow_ups && selectedCustomer.follow_ups.length > 0 ? (
              <Timeline
                items={selectedCustomer.follow_ups.map((followUp, index) => ({
                  key: index,
                  children: (
                    <Card 
                      size="small" 
                      style={{ 
                        marginBottom: '8px',
                        backgroundColor: '#fafafa'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <strong style={{ color: '#1890ff' }}>
                          {new Date(followUp.time).toLocaleString()}
                        </strong>
                        <span style={{ color: '#666', fontSize: '12px' }}>
                          第 {index + 1} 次跟进
                        </span>
                      </div>
                      <p style={{ margin: 0, lineHeight: '1.5' }}>{followUp.content}</p>
                    </Card>
                  )
                }))}
              />
            ) : (
              <div style={{ 
                textAlign: 'center', 
                color: '#999', 
                padding: '40px 0',
                backgroundColor: '#f9f9f9',
                borderRadius: '6px'
              }}>
                暂无跟进记录
              </div>
            )}
          </div>
        </div>

        <Form
          form={followUpForm}
          layout="vertical"
          onFinish={handleFollowUpSubmit}
        >
          <Form.Item
            name="content"
            label="新增跟进内容"
            rules={[{ required: true, message: '请输入跟进内容' }]}
          >
            <Input.TextArea rows={4} placeholder="请输入跟进内容" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                添加跟进记录
              </Button>
              <Button onClick={() => setFollowUpDrawerVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  )
}
