'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Table, 
  Button, 
  Modal, 
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
  Col
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, MoreOutlined } from '@ant-design/icons'
import { supabase, Customer, FollowUp } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

const { Option } = Select

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [followUpModalVisible, setFollowUpModalVisible] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [form] = Form.useForm()
  const [followUpForm] = Form.useForm()
  const { isAdmin, user } = useAuth()

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })

      // 如果是员工，只获取自己的客户
      if (!isAdmin && user?.username) {
        query = query.eq('owner', user.username)
      }
      // 管理员可以看到所有客户

      const { data, error } = await query

      if (error) throw error
      setCustomers(data || [])
    } catch {
      message.error('获取客户列表失败')
    } finally {
      setLoading(false)
    }
  }, [isAdmin, user])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])


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
    setFollowUpModalVisible(true)
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
      setFollowUpModalVisible(false)
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
      title: '联系方式',
      width: 120,
      dataIndex: 'contact',
      key: 'contact',
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
      width: 90,
      align: 'center' as const,
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
      width: 150,
      dataIndex: 'created_at',
      key: 'created_at',
      align: 'center' as const,
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: '最后跟进时间',
      width: 150,
      dataIndex: 'follow_ups',
      key: 'last_follow_up',
      align: 'center' as const,
      render: (followUps: FollowUp[]) => {
        if (!followUps || followUps.length === 0) {
          return <span style={{ color: '#999' }}>暂无跟进</span>
        }
        const lastFollowUp = followUps[followUps.length - 1]
        return new Date(lastFollowUp.time).toLocaleString()
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

        <Table
          columns={columns}
          dataSource={customers}
          loading={loading}
          rowKey="id"
          pagination={{
            pageSize: 10,
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

      <Modal
        title={`跟进记录 - ${selectedCustomer?.nickname}`}
        open={followUpModalVisible}
        onCancel={() => setFollowUpModalVisible(false)}
        footer={null}
        width={800}
        style={{ top: 20 }}
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
              <Button onClick={() => setFollowUpModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
