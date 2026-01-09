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
  DatePicker,
  Upload,
  Modal,
  Descriptions
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, MoreOutlined, SearchOutlined, FilterOutlined, CheckCircleOutlined, UploadOutlined, FilePdfOutlined } from '@ant-design/icons'
import { useRouter } from '@/navigation'
import { supabase, Customer, FollowUp } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import { useTranslations } from 'next-intl'

const { Option } = Select

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [followUpDrawerVisible, setFollowUpDrawerVisible] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [completeDrawerVisible, setCompleteDrawerVisible] = useState(false)
  const [completingCustomer, setCompletingCustomer] = useState<Customer | null>(null)
  const [companies, setCompanies] = useState<Array<{ id: string, name: string }>>([])
  const [workOrders, setWorkOrders] = useState<Array<{ id: string, name: string, company_id: string }>>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('')
  const [companyDetailModalVisible, setCompanyDetailModalVisible] = useState(false)
  const [selectedCompanyDetail, setSelectedCompanyDetail] = useState<any>(null)
  const [form] = Form.useForm()
  const [followUpForm] = Form.useForm()
  const [completeForm] = Form.useForm()
  const { isAdmin, user, canAccessCustomers } = useAuth()
  const t = useTranslations('potential')
  const tCommon = useTranslations('Common')
  const router = useRouter()

  // 筛选和搜索状态
  const [searchName, setSearchName] = useState('')
  const [minAge, setMinAge] = useState<number | null>(null)
  const [maxAge, setMaxAge] = useState<number | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [intentionFilter, setIntentionFilter] = useState<string>('')
  const [ownerFilter, setOwnerFilter] = useState<string>('')

  // 用户列表状态
  const [users, setUsers] = useState<Array<{ username: string }>>([])

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
      // 构建基础查询
      let query = supabase
        .from('customers')
        .select('*', { count: 'exact' })

      // 如果是员工，只获取自己的客户
      if (!isAdmin && user?.username) {
        query = query.eq('owner', user.username)
      }

      // 意向客户列表：只显示 status != 'closed' 的客户
      query = query.neq('status', 'closed')

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
      if (minAge !== null && minAge >= 0) {
        query = query.gte('age', minAge)
      }
      if (maxAge !== null && maxAge <= 100) {
        query = query.lte('age', maxAge)
      }

      // 所属人筛选（仅管理员可用）
      if (ownerFilter) {
        query = query.eq('owner', ownerFilter)
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
      message.error(tCommon('error'))
    } finally {
      setLoading(false)
    }
  }, [isAdmin, user, searchName, statusFilter, intentionFilter, minAge, maxAge, ownerFilter, currentPage, pageSize, sortField, sortOrder, tCommon])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // 获取企业列表
  const fetchCompanies = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .order('name', { ascending: true })

      if (error) throw error
      setCompanies(data || [])
    } catch (error) {
      console.error('获取企业列表失败:', error)
    }
  }, [])

  // 获取工单列表（根据企业ID）
  const fetchWorkOrders = useCallback(async (companyId: string) => {
    if (!companyId) {
      setWorkOrders([])
      return
    }
    try {
      const { data, error } = await supabase
        .from('work_orders')
        .select('id, name, company_id')
        .eq('company_id', companyId)
        .order('name', { ascending: true })

      if (error) throw error
      setWorkOrders(data || [])
    } catch (error) {
      console.error('获取工单列表失败:', error)
    }
  }, [])

  useEffect(() => {
    fetchCompanies()
  }, [fetchCompanies])

  // 当选择企业时，加载对应的工单列表
  useEffect(() => {
    if (selectedCompanyId) {
      fetchWorkOrders(selectedCompanyId)
      // 清空已选择的工单
      completeForm.setFieldsValue({ work_order_id: undefined })
    } else {
      setWorkOrders([])
    }
  }, [selectedCompanyId, fetchWorkOrders, completeForm])

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
    router.push(`/customers/potential/${record.id}?edit=true`)
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id)

      if (error) throw error
      message.success(tCommon('success'))
      fetchCustomers()
    } catch {
      message.error(tCommon('error'))
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
      message.success(tCommon('success'))
      fetchCustomers()
    } catch {
      message.error(tCommon('error'))
    }
  }

  const handleSubmit = async (values: Customer) => {
    try {
      // 自动设置所属人为当前用户
      const submitValues = {
        nickname: values.nickname,
        contact: values.contact,
        intention: values.intention,
        status: values.status,
        age: values.age || null,
        gender: values.gender || null,
        work_experience: values.work_experience || null,
        notes: values.notes || null,
        source: values.source || '',
        owner: user?.username || 'employee',
        follow_ups: values.follow_ups || []
      }

      if (editingCustomer) {
        const { error } = await supabase
          .from('customers')
          .update(submitValues)
          .eq('id', editingCustomer.id)

        if (error) throw error
        message.success(tCommon('success'))
      } else {
        const { error } = await supabase
          .from('customers')
          .insert([submitValues])

        if (error) throw error
        message.success(tCommon('success'))
      }
      setDrawerVisible(false)
      fetchCustomers()
    } catch (error: any) {
      console.error('提交错误:', error)
      message.error(`${tCommon('error')}: ${error?.message || '未知错误'}`)
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
      message.success(tCommon('success'))
      setFollowUpDrawerVisible(false)
      fetchCustomers()
    } catch {
      message.error(tCommon('error'))
    }
  }

  // 处理"已完成"按钮点击
  const handleComplete = (record: Customer) => {
    setCompletingCustomer(record)
    setSelectedCompanyId('')
    setWorkOrders([])
    completeForm.resetFields()
    setCompleteDrawerVisible(true)
  }

  // 处理企业选择变化
  const handleCompanyChange = async (companyId: string) => {
    setSelectedCompanyId(companyId)
    completeForm.setFieldsValue({ work_order_id: undefined })
    // 立即加载工单列表
    if (companyId) {
      await fetchWorkOrders(companyId)
    } else {
      setWorkOrders([])
    }
  }

  // 获取企业详情
  const fetchCompanyDetail = useCallback(async (companyId: string) => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single()

      if (error) throw error
      setSelectedCompanyDetail(data)
      setCompanyDetailModalVisible(true)
    } catch (error) {
      console.error('获取企业详情失败:', error)
      message.error(tCommon('error'))
    }
  }, [tCommon])

  // 查看企业详情
  const handleViewCompanyDetail = (companyId: string) => {
    fetchCompanyDetail(companyId)
  }

  // 处理补充信息提交
  const handleCompleteSubmit = async (values: any) => {
    if (!completingCustomer) return

    try {
      // 确保数据类型正确，处理 InputNumber 可能返回 null 的情况
      const updateData: any = {
        status: 'closed',
        real_name: values.real_name?.trim() || null,
        phone: values.phone?.trim() || null,
        hourly_rate: values.hourly_rate != null ? parseFloat(String(values.hourly_rate)) : null,
        gender: values.gender || null,
        birth_date: values.birth_date ? values.birth_date.format('YYYY-MM-DD') : null,
        household_location: values.household_location?.trim() || null,
        current_residence: values.current_residence?.trim() || null,
        contact: values.contact?.trim() || null,
        wechat: values.wechat?.trim() || null,
        emergency_contact: values.emergency_contact?.trim() || null,
        emergency_phone: values.emergency_phone?.trim() || null,
        company_id: values.company_id || null,
        work_order_id: values.work_order_id || null,
        stage2_status: '待面试',
        wallet_balance: 0
      }

      // 移除 null 值，避免某些字段不允许 null 的情况
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === null && key !== 'hourly_rate') {
          delete updateData[key]
        }
      })

      console.log('更新数据:', updateData)
      console.log('客户ID:', completingCustomer.id)

      const { error, data } = await supabase
        .from('customers')
        .update(updateData)
        .eq('id', completingCustomer.id)
        .select()

      if (error) {
        console.error('更新错误详情:', error)
        // 如果是字段不存在的错误，提示用户执行SQL更新
        if (error.message?.includes('column') || error.code === 'PGRST204') {
          message.error(t('messages.dbError'))
        } else {
          message.error(`${tCommon('error')}: ${error.message || JSON.stringify(error)}`)
        }
        return
      }

      message.success(tCommon('success'))
      setCompleteDrawerVisible(false)
      fetchCustomers()
    } catch (error: any) {
      console.error('更新异常:', error)
      message.error(`${tCommon('error')}: ${error?.message || '未知错误'}`)
    }
  }

  const columns = [
    {
      title: t('columns.nickname'),
      width: 90,
      dataIndex: 'nickname',
      key: 'nickname',
      align: 'center' as const,
    },
    {
      title: t('columns.source'),
      width: 90,
      dataIndex: 'source',
      key: 'source',
      align: 'center' as const,
    },
    {
      title: t('columns.intention'),
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
      title: t('columns.status'),
      dataIndex: 'status',
      key: 'status',
      width: 20,
      align: 'center' as const,
      render: (status: string) => {
        const statusConfig = {
          communicating: { color: 'green', text: t('status.communicating') },
          closed: { color: 'default', text: t('status.closed') },
          rejected: { color: 'red', text: t('status.rejected') }
        }
        const config = statusConfig[status as keyof typeof statusConfig] || { color: 'default', text: status }
        return <Tag color={config.color}>{config.text}</Tag>
      },
    },
    {
      title: t('columns.age'),
      width: 80,
      dataIndex: 'age',
      key: 'age',
      align: 'center' as const,
      sorter: true,
      render: (age: number) => age ? `${age}${t('form.ageUnit')}` : '-',
    },
    {
      title: t('columns.gender'),
      width: 60,
      dataIndex: 'gender',
      key: 'gender',
      align: 'center' as const,
      render: (gender: string) => {
        if (!gender) return '-'
        const genderText = {
          male: t('gender.male'),
          female: t('gender.female')
        }
        return genderText[gender as keyof typeof genderText] || gender
      },
    },
    {
      title: t('columns.contact'),
      width: 120,
      dataIndex: 'contact',
      key: 'contact',
      align: 'center' as const,
    },
    {
      title: t('columns.workExperience'),
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
      title: t('columns.notes'),
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
      title: t('columns.owner'),
      width: 90,
      dataIndex: 'owner',
      key: 'owner',
      align: 'center' as const,
      render: (owner: string) => owner || '-',
    }] : []),
    {
      title: t('columns.followUps'),
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
      title: t('columns.createdAt'),
      width: 100,
      dataIndex: 'created_at',
      key: 'created_at',
      align: 'center' as const,
      sorter: true,
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: t('columns.lastFollowUp'),
      width: 150,
      dataIndex: 'follow_ups',
      key: 'last_follow_up',
      align: 'center' as const,
      sorter: true,
      render: (followUps: FollowUp[]) => {
        if (!followUps || followUps.length === 0) {
          return <span style={{ color: '#999' }}>{t('messages.noFollowUp')}</span>
        }
        const lastFollowUp = followUps[followUps.length - 1]
        return new Date(lastFollowUp.time).toLocaleDateString()
      },
    },
    {
      title: t('columns.actions'),
      key: 'action',
      fixed: 'right' as const,
      width: 150,
      align: 'center' as const,
      render: (_: any, record: Customer) => {
        const menuItems: any[] = [
          {
            key: 'view',
            label: t('actions.view'),
            onClick: () => router.push(`/customers/potential/${record.id}`),
          },
          {
            key: 'edit',
            label: tCommon('edit'),
            onClick: () => handleEdit(record),
          },
          {
            key: 'followUp',
            label: t('actions.followUp'),
            onClick: () => {
              setSelectedCustomer(record)
              setFollowUpDrawerVisible(true)
            },
          },
          {
            key: 'complete',
            label: t('actions.complete'),
            onClick: () => {
              setCompletingCustomer(record)
              setCompleteDrawerVisible(true)
            },
          },
          {
            type: 'divider' as const,
          },
          {
            key: 'changeStatus',
            label: t('actions.changeStatus'),
            children: [
              {
                key: 'communicating',
                label: t('status.communicating'),
                onClick: () => handleStatusChange(record.id, 'communicating'),
              },
              {
                key: 'rejected',
                label: t('status.rejected'),
                onClick: () => handleStatusChange(record.id, 'rejected'),
              },
            ],
          },
        ]

        // 仅管理员可以删除
        if (isAdmin) {
          menuItems.push(
            {
              type: 'divider' as const,
            },
            {
              key: 'delete',
              label: tCommon('delete'),
              danger: true,
              onClick: () => {
                Modal.confirm({
                  title: t('deleteConfirm'),
                  content: t('deleteMessage'),
                  okText: tCommon('confirm'),
                  cancelText: tCommon('cancel'),
                  okButtonProps: { danger: true },
                  onOk: () => handleDelete(record.id),
                })
              },
            }
          )
        }

        return (
          <Dropdown menu={{ items: menuItems }} trigger={['click']}>
            <Button type="link" icon={<MoreOutlined />} />
          </Dropdown>
        )
      },
    },
  ]

  if (!canAccessCustomers) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <h2>{tCommon('noPermission')}</h2>
          <p>{tCommon('noPermissionMessage')}</p>
        </div>
      </Card>
    )
  }

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>{t('title')}</h2>
          {!isAdmin && (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              {t('add')}
            </Button>
          )}
        </div>

        {/* 筛选和搜索区域 */}
        <Card style={{ marginBottom: 16 }}>
          <h3 style={{ marginBottom: 16 }}>{tCommon('search')}</h3>
          {/* 第一行筛选器 */}
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>{t('form.nickname')}</label>
                <Input
                  placeholder={t('form.nickname')}
                  prefix={<SearchOutlined />}
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  allowClear
                />
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>{t('form.status')}</label>
                <Select
                  placeholder={t('form.status')}
                  value={statusFilter}
                  onChange={setStatusFilter}
                  allowClear
                  style={{ width: '100%' }}
                >
                  <Option value="communicating">{t('status.communicating')}</Option>
                  <Option value="rejected">{t('status.rejected')}</Option>
                </Select>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>{t('form.intention')}</label>
                <Select
                  placeholder={t('form.intention')}
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
            <Col xs={24} sm={12} md={6}>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>{t('form.age')}</label>
                <Space.Compact style={{ width: '100%' }}>
                  <InputNumber
                    placeholder={t('form.min')}
                    min={0}
                    max={100}
                    value={minAge}
                    onChange={setMinAge}
                    style={{ width: '45%' }}
                    addonAfter={t('form.ageUnit')}
                  />
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '10%',
                    color: '#666',
                    fontSize: '14px',
                    fontWeight: 500
                  }}>
                    {t('form.to')}
                  </div>
                  <InputNumber
                    placeholder={t('form.max')}
                    min={0}
                    max={100}
                    value={maxAge}
                    onChange={setMaxAge}
                    style={{ width: '45%' }}
                    addonAfter={t('form.ageUnit')}
                  />
                </Space.Compact>
              </div>
            </Col>
          </Row>

          {/* 第二行筛选器（仅管理员可见） */}
          {isAdmin && (
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
              <Col xs={24} sm={12} md={6}>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>{t('columns.owner')}</label>
                  <Select
                    placeholder={t('columns.owner')}
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
            </Row>
          )}
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
                    setOwnerFilter('')
                  }}>
                    {tCommon('reset')}
                  </Button>
                </Space>
              </div>
            </Col>
          </Row>
        </Card>

        <Table
          columns={columns}
          dataSource={customers}
          rowKey="id"
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showTotal: (total) => `${tCommon('total')} ${total} ${tCommon('items')}`
          }}
          scroll={{ x: 'max-content' }}
          onChange={handleTableChange}
        />
      </Card>

      <Drawer
        title={editingCustomer ? t('edit') : t('add')}
        width={720}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        bodyStyle={{ paddingBottom: 80 }}
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
                label={t('form.nickname')}
                rules={[{ required: true, message: t('form.nicknameRequired') }]}
              >
                <Input placeholder={t('form.nickname')} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="contact"
                label={t('form.contact')}
                rules={[{ required: true, message: t('form.contactRequired') }]}
              >
                <Input placeholder={t('form.contact')} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="intention"
                label={t('form.intention')}
                rules={[{ required: true, message: t('form.intentionRequired') }]}
              >
                <Select placeholder={t('form.intention')}>
                  <Option value="高">高</Option>
                  <Option value="中">中</Option>
                  <Option value="低">低</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="status"
                label={t('form.status')}
                rules={[{ required: true, message: t('form.statusRequired') }]}
                initialValue="communicating"
              >
                <Select placeholder={t('form.status')}>
                  <Option value="communicating">{t('status.communicating')}</Option>
                  <Option value="rejected">{t('status.rejected')}</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="age"
                label={t('form.age')}
              >
                <InputNumber style={{ width: '100%' }} min={0} max={100} placeholder={t('form.age')} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="gender"
                label={t('form.gender')}
              >
                <Select placeholder={t('form.gender')}>
                  <Option value="male">{t('gender.male')}</Option>
                  <Option value="female">{t('gender.female')}</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="work_experience"
                label={t('form.workExperience')}
              >
                <Input.TextArea rows={4} placeholder={t('form.workExperience')} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="notes"
                label={t('form.notes')}
              >
                <Input.TextArea rows={4} placeholder={t('form.notes')} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item>
            <Space>
              <Button onClick={() => setDrawerVisible(false)}>{tCommon('cancel')}</Button>
              <Button type="primary" htmlType="submit">
                {tCommon('submit')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Drawer>

      <Drawer
        title="跟进记录"
        width={500}
        onClose={() => setFollowUpDrawerVisible(false)}
        open={followUpDrawerVisible}
      >
        <div style={{ marginBottom: 24 }}>
          <h3>添加跟进记录</h3>
          <Form
            form={followUpForm}
            onFinish={handleFollowUpSubmit}
          >
            <Form.Item
              name="content"
              rules={[{ required: true, message: '请输入跟进内容' }]}
            >
              <Input.TextArea rows={4} placeholder="请输入跟进内容..." />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit">
                提交跟进
              </Button>
            </Form.Item>
          </Form>
        </div>

        <div>
          <h3>历史跟进记录</h3>
          {selectedCustomer?.follow_ups && selectedCustomer.follow_ups.length > 0 ? (
            <Timeline
              items={selectedCustomer.follow_ups.map((item) => ({
                children: (
                  <>
                    <p>{new Date(item.time).toLocaleString()}</p>
                    <p>{item.content}</p>
                  </>
                ),
              })).reverse()}
            />
          ) : (
            <p style={{ color: '#999' }}>暂无跟进记录</p>
          )}
        </div>
      </Drawer>

      {/* 补充信息 Drawer */}
      <Drawer
        title="完善客户信息（转为正式客户）"
        width={720}
        onClose={() => setCompleteDrawerVisible(false)}
        open={completeDrawerVisible}
        maskClosable={false}
      >
        <Form
          form={completeForm}
          layout="vertical"
          onFinish={handleCompleteSubmit}
          initialValues={{
            gender: completingCustomer?.gender || undefined,
            contact: completingCustomer?.contact || undefined,
          }}
        >
          <Card title="基本信息" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="real_name"
                  label="真实姓名"
                  rules={[{ required: true, message: '请输入真实姓名' }]}
                >
                  <Input placeholder="请输入真实姓名" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="gender"
                  label="性别"
                  rules={[{ required: true, message: '请选择性别' }]}
                >
                  <Select placeholder="请选择性别">
                    <Option value="male">男</Option>
                    <Option value="female">女</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="birth_date"
                  label="出生日期"
                  rules={[{ required: true, message: '请选择出生日期' }]}
                >
                  <DatePicker style={{ width: '100%' }} placeholder="请选择出生日期" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="phone"
                  label="手机号码"
                  rules={[{ required: true, message: '请输入手机号码' }]}
                >
                  <Input placeholder="请输入手机号码" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="household_location"
                  label="户籍所在地"
                  rules={[{ required: true, message: '请输入户籍所在地' }]}
                >
                  <Input placeholder="请输入户籍所在地" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="current_residence"
                  label="现居住地"
                  rules={[{ required: true, message: '请输入现居住地' }]}
                >
                  <Input placeholder="请输入现居住地" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="contact"
                  label="其他联系方式"
                >
                  <Input placeholder="请输入其他联系方式" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="wechat"
                  label="微信号"
                >
                  <Input placeholder="请输入微信号" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="emergency_contact"
                  label="紧急联系人"
                >
                  <Input placeholder="请输入紧急联系人" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="emergency_phone"
                  label="紧急联系人电话"
                >
                  <Input placeholder="请输入紧急联系人电话" />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card title="工作信息" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="company_id"
                  label="所属企业"
                  rules={[{ required: true, message: '请选择所属企业' }]}
                >
                  <Select
                    placeholder="请选择所属企业"
                    onChange={handleCompanyChange}
                    showSearch
                    optionFilterProp="children"
                  >
                    {companies.map(company => (
                      <Option key={company.id} value={company.id}>{company.name}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="work_order_id"
                  label="关联工单"
                  rules={[{ required: true, message: '请选择关联工单' }]}
                >
                  <Select
                    placeholder={selectedCompanyId ? "请选择关联工单" : "请先选择企业"}
                    disabled={!selectedCompanyId}
                    showSearch
                    optionFilterProp="children"
                  >
                    {workOrders.map(order => (
                      <Option key={order.id} value={order.id}>{order.name}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="hourly_rate"
                  label="时薪 (日元)"
                  rules={[{ required: true, message: '请输入时薪' }]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="请输入时薪"
                    min={0}
                    precision={0}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Form.Item>
            <Space style={{ float: 'right' }}>
              <Button onClick={() => setCompleteDrawerVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                确认转为正式客户
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Drawer>

      {/* 企业详情弹窗 */}
      <Modal
        title="企业详情"
        open={companyDetailModalVisible}
        onCancel={() => setCompanyDetailModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedCompanyDetail && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="企业名称">{selectedCompanyDetail.name}</Descriptions.Item>
            <Descriptions.Item label="所属行业">{selectedCompanyDetail.industry}</Descriptions.Item>
            <Descriptions.Item label="法人番号">{selectedCompanyDetail.legal_number}</Descriptions.Item>
            <Descriptions.Item label="代表取缔役">{selectedCompanyDetail.representative}</Descriptions.Item>
            <Descriptions.Item label="公司从业人数">{selectedCompanyDetail.employee_count}</Descriptions.Item>
            <Descriptions.Item label="注册资本金">{selectedCompanyDetail.registered_capital}</Descriptions.Item>
            <Descriptions.Item label="公司地址" span={2}>{selectedCompanyDetail.address}</Descriptions.Item>
            <Descriptions.Item label="联系方式">{selectedCompanyDetail.contact}</Descriptions.Item>
            <Descriptions.Item label="联系邮箱">{selectedCompanyDetail.email}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}
