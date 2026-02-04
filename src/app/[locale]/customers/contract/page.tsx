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
  Modal
} from 'antd'
import { MoreOutlined, DollarOutlined, SwapOutlined, EyeOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { supabase, Customer, Payment } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from '@/navigation'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { useTranslations } from 'next-intl'

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
  const [bindDrawerVisible, setBindDrawerVisible] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [companies, setCompanies] = useState<Map<string, string>>(new Map()) // company_id -> company_name
  const [workOrders, setWorkOrders] = useState<Map<string, string>>(new Map()) // work_order_id -> work_order_name
  const [companyList, setCompanyList] = useState<Array<{ id: string, name: string }>>([])
  const [workOrderList, setWorkOrderList] = useState<Array<{ id: string, name: string, company_id: string }>>([])
  const [selectedBindCompanyId, setSelectedBindCompanyId] = useState<string>('')
  const [statusForm] = Form.useForm()
  const [paymentForm] = Form.useForm()
  const [bindForm] = Form.useForm()
  const [createDrawerVisible, setCreateDrawerVisible] = useState(false)
  const [createForm] = Form.useForm()
  const { isAdmin, user, canAccessCustomers } = useAuth()
  const router = useRouter()
  const t = useTranslations('contract')
  const tCommon = useTranslations('Common')

  // 筛选和搜索状态
  const [searchName, setSearchName] = useState('')
  const [stage2StatusFilter, setStage2StatusFilter] = useState<string>('')
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
      message.error(tCommon('error'))
    } finally {
      setLoading(false)
    }
  }, [isAdmin, user, searchName, stage2StatusFilter, ownerFilter, currentPage, pageSize, sortField, sortOrder, tCommon])

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
          message.error(t('messages.paymentTableError'))
        } else {
          message.error(`${t('messages.fetchPaymentError')}: ${error.message}`)
        }
        setPayments([])
        return
      }
      setPayments(data || [])
    } catch (error: any) {
      console.error('获取付款记录异常:', error)
      message.error(`${t('messages.fetchPaymentError')}: ${error?.message || tCommon('error')}`)
      setPayments([])
    }
  }, [])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // 获取企业和工单名称映射
  const fetchCompanyAndWorkOrderNames = useCallback(async () => {
    try {
      // 获取企业列表
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, name')
        .order('name', { ascending: true })

      if (companiesError) throw companiesError

      const companiesMap = new Map<string, string>()
      const companiesList: Array<{ id: string, name: string }> = []
      companiesData?.forEach(company => {
        companiesMap.set(company.id, company.name)
        companiesList.push({ id: company.id, name: company.name })
      })
      setCompanies(companiesMap)
      setCompanyList(companiesList)

      // 获取工单列表
      const { data: workOrdersData, error: workOrdersError } = await supabase
        .from('work_orders')
        .select('id, name, company_id')
        .order('name', { ascending: true })

      if (workOrdersError) throw workOrdersError

      const workOrdersMap = new Map<string, string>()
      const workOrdersList: Array<{ id: string, name: string, company_id: string }> = []
      workOrdersData?.forEach(workOrder => {
        workOrdersMap.set(workOrder.id, workOrder.name)
        workOrdersList.push({
          id: workOrder.id,
          name: workOrder.name,
          company_id: workOrder.company_id
        })
      })
      setWorkOrders(workOrdersMap)
      setWorkOrderList(workOrdersList)
    } catch (error) {
      console.error('获取企业和工单名称失败:', error)
    }
  }, [])

  // 获取工单列表（根据企业ID）
  const fetchWorkOrdersByCompany = useCallback(async (companyId: string) => {
    if (!companyId) {
      setWorkOrderList([])
      return
    }
    try {
      const { data, error } = await supabase
        .from('work_orders')
        .select('id, name, company_id')
        .eq('company_id', companyId)
        .order('name', { ascending: true })

      if (error) throw error
      setWorkOrderList(data || [])
    } catch (error) {
      console.error('获取工单列表失败:', error)
      setWorkOrderList([])
    }
  }, [])

  // 处理绑定
  const handleBind = (record: Customer) => {
    setSelectedCustomer(record)
    setSelectedBindCompanyId('')
    setWorkOrderList([])
    bindForm.resetFields()
    bindForm.setFieldsValue({
      company_id: record.company_id || undefined,
      work_order_id: record.work_order_id || undefined,
    })
    if (record.company_id) {
      setSelectedBindCompanyId(record.company_id)
      fetchWorkOrdersByCompany(record.company_id)
    }
    setBindDrawerVisible(true)
  }

  // 处理企业选择变化（绑定）
  const handleBindCompanyChange = async (companyId: string) => {
    setSelectedBindCompanyId(companyId)
    bindForm.setFieldsValue({ work_order_id: undefined })
    // 立即加载工单列表
    if (companyId) {
      await fetchWorkOrdersByCompany(companyId)
    } else {
      setWorkOrderList([])
    }
  }

  // 提交绑定
  const handleBindSubmit = async (values: any) => {
    if (!selectedCustomer) return

    try {
      const { error } = await supabase
        .from('customers')
        .update({
          company_id: values.company_id || null,
          work_order_id: values.work_order_id || null,
        })
        .eq('id', selectedCustomer.id)

      if (error) throw error
      message.success(tCommon('success'))
      setBindDrawerVisible(false)
      fetchCustomers()
      // 刷新企业和工单名称映射
      fetchCompanyAndWorkOrderNames()
    } catch {
      message.error(tCommon('error'))
    }
  }

  useEffect(() => {
    fetchCompanyAndWorkOrderNames()
  }, [fetchCompanyAndWorkOrderNames])

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
          message.error(t('messages.interviewTimeRequired'))
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

      // 自动生成入会申请书逻辑
      if (values.stage2_status === '培训中' && selectedCustomer.stage2_status !== '培训中' && selectedCustomer.company_id) {
        try {
          message.loading(tCommon('generatingDocument'))

          // 1. Fetch current company files
          const { data: company, error: companyError } = await supabase
            .from('companies')
            .select('association_application_form')
            .eq('id', selectedCustomer.company_id)
            .single()

          if (!companyError && company) {
            // 2. Generate DOCX
            const { Document, Packer, Paragraph, TextRun, AlignmentType } = await import('docx')

            const doc = new Document({
              sections: [{
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        text: "技能实习生入会申请书",
                        bold: true,
                        size: 32,
                      }),
                    ],
                  }),
                  new Paragraph({
                    text: `申请人: ${selectedCustomer.real_name}`,
                    spacing: { before: 400 },
                  }),
                  new Paragraph({
                    text: `申请日期: ${dayjs().format('YYYY-MM-DD')}`,
                  }),
                  new Paragraph({
                    text: "兹申请加入组合。",
                    spacing: { before: 200 },
                  }),
                ],
              }],
            });

            const blob = await Packer.toBlob(doc);
            const fileName = `入会申请书_${selectedCustomer.real_name}_${dayjs().format('YYYYMMDD')}.docx`;
            const file = new File([blob], fileName, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

            // 3. Upload
            const formData = new FormData();
            formData.append('file', file);

            const uploadRes = await fetch('/api/upload', {
              method: 'POST',
              body: formData
            });

            if (uploadRes.ok) {
              const { url } = await uploadRes.json();
              const currentFiles = company.association_application_form || [];
              const newFile = {
                url: url,
                uploadedAt: new Date().toISOString()
              };

              // 4. Update Company
              await supabase
                .from('companies')
                .update({ association_application_form: [...currentFiles, newFile] })
                .eq('id', selectedCustomer.company_id);

              message.success('已自动生成入会申请书')
            }
          }
        } catch (genError) {
          console.error('Auto-generation failed:', genError)
          message.error('生成入会申请书失败')
        }
      }

      message.success(tCommon('success'))
      setStatusDrawerVisible(false)
      fetchCustomers()
    } catch {
      message.error(tCommon('error'))
    }
  }

  // 处理编辑 - 跳转到详情页面并自动进入编辑模式
  const handleEdit = (record: Customer) => {
    router.push(`/customers/contract/${record.id}?edit=true`)
  }

  // 处理删除
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
          message.error(t('messages.paymentTableError'))
        } else {
          message.error(`${t('messages.paymentError')}: ${paymentError.message}`)
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

      message.success(t('messages.paymentSuccess'))
      setPaymentDrawerVisible(false)
      fetchCustomers()
    } catch {
      message.error(t('messages.paymentError'))
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

  const handleCreate = () => {
    createForm.resetFields()
    setCreateDrawerVisible(true)
  }

  const handleCreateSubmit = async (values: any) => {
    try {
      const submitValues = {
        real_name: values.real_name,
        phone: values.phone,
        gender: values.gender,
        birth_date: values.birth_date ? values.birth_date.format('YYYY-MM-DD') : null,
        household_location: values.household_location,
        current_residence: values.current_residence,
        contact: values.contact,
        wechat: values.wechat,
        emergency_contact: values.emergency_contact,
        emergency_phone: values.emergency_phone,
        work_experience: values.work_experience,
        notes: values.notes,
        status: 'closed',
        stage2_status: '待面试',
        owner: user?.username || 'employee',
        wallet_balance: 0,
        nickname: values.real_name, // Fallback for legacy field
        intention: '高', // Default
        source: '直接创建'
      }

      const { error } = await supabase
        .from('customers')
        .insert([submitValues])

      if (error) throw error

      message.success(tCommon('success'))
      setCreateDrawerVisible(false)
      fetchCustomers()
    } catch (error: any) {
      console.error('Create error:', error)
      message.error(`${tCommon('error')}: ${error?.message || 'Unknown error'}`)
    }
  }

  const columns = [
    {
      title: t('columns.realName'),
      width: 100,
      dataIndex: 'real_name',
      key: 'real_name',
      align: 'center' as const,
      render: (name: string) => name || '-',
    },
    {
      title: t('columns.status'),
      width: 120,
      dataIndex: 'stage2_status',
      key: 'stage2_status',
      align: 'center' as const,
      render: (status: string, record: Customer) => {
        const statusConfig: Record<string, { color: string; text: string }> = {
          '待面试': { color: 'blue', text: t('status.pending') },
          '已通知面试': { color: 'orange', text: t('status.interviewNotified') },
          '面试通过': { color: 'green', text: t('status.interviewPassed') },
          '面试失败': { color: 'red', text: t('status.interviewFailed') },
          '培训中': { color: 'purple', text: t('status.training') },
          '已完成': { color: 'default', text: t('status.completed') }
        }
        const config = statusConfig[status] || { color: 'default', text: status || '-' }

        // 如果是"已通知面试"，需要填写时间
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
      title: t('columns.age'),
      width: 80,
      dataIndex: 'birth_date',
      key: 'age',
      align: 'center' as const,
      render: (birthDate: string) => {
        if (!birthDate) return '-'
        const birth = dayjs(birthDate)
        const today = dayjs()
        const age = today.diff(birth, 'year')
        return `${age}${tCommon('ageUnit')}`
      },
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
          male: tCommon('gender.male'),
          female: tCommon('gender.female')
        }
        return genderText[gender as keyof typeof genderText] || gender
      },
    },
    {
      title: t('columns.phone'),
      width: 120,
      dataIndex: 'phone',
      key: 'phone',
      align: 'center' as const,
      render: (phone: string) => phone || '-',
    },
    {
      title: t('columns.contact'),
      width: 120,
      dataIndex: 'contact',
      key: 'contact',
      align: 'center' as const,
    },
    {
      title: t('columns.companyWorkOrder'),
      width: 200,
      key: 'company_work_order',
      align: 'center' as const,
      render: (_: any, record: Customer) => {
        const companyName = record.company_id ? companies.get(record.company_id) : null
        const workOrderName = record.work_order_id ? workOrders.get(record.work_order_id) : null
        if (!companyName && !workOrderName) {
          return (
            <Button
              type="link"
              size="small"
              onClick={() => handleBind(record)}
            >
              {t('actions.bind')}
            </Button>
          )
        }
        const displayText = companyName && workOrderName
          ? `${companyName} / ${workOrderName}`
          : companyName || workOrderName || '-'
        const fullText = companyName && workOrderName
          ? `${companyName} / ${workOrderName}`
          : companyName || workOrderName || '-'
        const truncatedText = displayText.length > 15 ? `${displayText.substring(0, 15)}...` : displayText

        // 如果有企业ID，显示为可点击的链接
        if (record.company_id) {
          return (
            <Tooltip title={fullText} placement="topLeft">
              <Button
                type="link"
                size="small"
                style={{ padding: 0, height: 'auto' }}
                onClick={() => router.push(`/companies/${record.company_id}`)}
              >
                {truncatedText}
              </Button>
            </Tooltip>
          )
        }

        return (
          <Tooltip title={fullText} placement="topLeft">
            <span style={{ cursor: 'help', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{truncatedText}</span>
          </Tooltip>
        )
      },
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
      title: t('columns.walletBalance'),
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
      title: t('columns.createdAt'),
      width: 100,
      dataIndex: 'created_at',
      key: 'created_at',
      align: 'center' as const,
      sorter: true,
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: t('columns.lastPaymentTime'),
      width: 120,
      dataIndex: 'last_payment_time',
      key: 'last_payment_time',
      align: 'center' as const,
      render: (date: string) => date ? new Date(date).toLocaleDateString() : '-',
    },
    {
      title: t('columns.actions'),
      key: 'action',
      width: 20,
      align: 'center' as const,
      render: (_: unknown, record: Customer) => {
        const menuItems = [
          {
            key: 'view',
            label: t('actions.view'),
            icon: <EyeOutlined />,
            onClick: () => router.push(`/customers/contract/${record.id}`)
          },
          {
            key: 'edit',
            label: t('actions.edit'),
            icon: <EditOutlined />,
            onClick: () => handleEdit(record)
          },
          {
            key: 'status',
            label: t('actions.changeStatus'),
            icon: <SwapOutlined />,
            onClick: () => handleStatusChange(record)
          },
          {
            key: 'payment',
            label: t('actions.payment'),
            icon: <DollarOutlined />,
            onClick: () => handlePayment(record)
          }
        ]

        if (isAdmin) {
          // 如果已经绑定了企业/工单，添加切换选项
          if (record.company_id || record.work_order_id) {
            menuItems.push({
              key: 'switchBinding',
              label: t('actions.switchBinding'),
              icon: <SwapOutlined />,
              onClick: () => handleBind(record)
            })
          }

          menuItems.push({
            key: 'delete',
            label: t('actions.delete'),
            icon: <DeleteOutlined />,
            onClick: () => {
              Modal.confirm({
                title: t('messages.confirmDeleteTitle'),
                content: t('messages.confirmDeleteContent'),
                okText: t('messages.confirmOk'),
                cancelText: t('messages.confirmCancel'),
                okButtonProps: { danger: true },
                onOk: () => handleDelete(record.id),
              })
            }
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
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              {t('add')}
            </Button>
          )}
        </div>

        {/* 筛选和搜索区域 */}
        <Card style={{ marginBottom: 16 }}>
          <h3 style={{ marginBottom: 16 }}>{tCommon('search')}</h3>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>{t('search.realName')}</label>
                <Input
                  placeholder={t('search.realNamePlaceholder')}
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  allowClear
                />
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>{t('search.status')}</label>
                <Select
                  placeholder={t('search.status')}
                  value={stage2StatusFilter}
                  onChange={setStage2StatusFilter}
                  allowClear
                  style={{ width: '100%' }}
                >
                  <Option value="待面试">{t('status.pending')}</Option>
                  <Option value="已通知面试">{t('status.interviewNotified')}</Option>
                  <Option value="面试通过">{t('status.interviewPassed')}</Option>
                  <Option value="面试失败">{t('status.interviewFailed')}</Option>
                  <Option value="培训中">{t('status.training')}</Option>
                  <Option value="已完成">{t('status.completed')}</Option>
                </Select>
              </div>
            </Col>
            {isAdmin && (
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
                  {tCommon('reset')}
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
          scroll={{ x: 'max-content' }}
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

      {/* 绑定企业/工单Drawer */}
      <Drawer
        title={`绑定企业/工单 - ${selectedCustomer?.real_name || selectedCustomer?.nickname}`}
        open={bindDrawerVisible}
        onClose={() => setBindDrawerVisible(false)}
        width={600}
        placement="right"
      >
        <Form
          form={bindForm}
          layout="vertical"
          onFinish={handleBindSubmit}
        >
          <Form.Item
            name="company_id"
            label="关联企业"
            rules={[{ required: true, message: '请选择关联企业' }]}
          >
            <Select
              placeholder="请选择关联企业"
              onChange={handleBindCompanyChange}
              allowClear
            >
              {companyList.map(company => (
                <Option key={company.id} value={company.id}>
                  {company.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="work_order_id"
            label="关联工单"
            rules={[{ required: true, message: '请选择关联工单' }]}
          >
            <Select
              placeholder={selectedBindCompanyId ? (workOrderList.length === 0 ? "该企业暂无工单" : "请选择关联工单") : "请先选择关联企业"}
              disabled={!selectedBindCompanyId}
              loading={!!(selectedBindCompanyId && workOrderList.length === 0)}
            >
              {workOrderList.map(workOrder => (
                <Option key={workOrder.id} value={workOrder.id}>
                  {workOrder.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                保存
              </Button>
              <Button onClick={() => setBindDrawerVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Drawer>


      {/* 创建客户 Drawer */}
      <Drawer
        title={t('add')}
        placement="right"
        width={720}
        onClose={() => setCreateDrawerVisible(false)}
        open={createDrawerVisible}
        extra={
          <Space>
            <Button onClick={() => setCreateDrawerVisible(false)}>{tCommon('cancel')}</Button>
            <Button type="primary" onClick={() => createForm.submit()}>
              {tCommon('submit')}
            </Button>
          </Space>
        }
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreateSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="real_name"
                label={t('form.realName')}
                rules={[{ required: true, message: t('form.realNamePlaceholder') }]}
              >
                <Input placeholder={t('form.realNamePlaceholder')} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="phone"
                label={t('columns.phone')}
                rules={[{ required: true, message: t('form.contactPlaceholder') }]}
              >
                <Input placeholder={t('form.contactPlaceholder')} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="gender"
                label={t('form.gender')}
                rules={[{ required: true, message: t('form.genderPlaceholder') }]}
              >
                <Select placeholder={t('form.genderPlaceholder')}>
                  <Option value="male">{tCommon('gender.male')}</Option>
                  <Option value="female">{tCommon('gender.female')}</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="birth_date"
                label={t('form.birthDate')}
                rules={[{ required: true, message: t('form.birthDatePlaceholder') }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="household_location"
                label={t('form.householdLocation')}
              >
                <Input placeholder={t('form.householdLocationPlaceholder')} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="current_residence"
                label={t('form.currentResidence')}
              >
                <Input placeholder={t('form.currentResidencePlaceholder')} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="contact"
                label={t('form.contact')}
              >
                <Input placeholder={t('form.contactPlaceholder')} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="wechat"
                label={t('form.wechat')}
              >
                <Input placeholder={t('form.wechatPlaceholder')} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="emergency_contact"
                label={t('form.emergencyContact')}
              >
                <Input placeholder={t('form.emergencyContactPlaceholder')} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="emergency_phone"
                label={t('form.emergencyPhone')}
              >
                <Input placeholder={t('form.emergencyPhonePlaceholder')} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="work_experience"
                label={t('columns.workExperience')}
              >
                <Input.TextArea rows={4} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="notes"
                label={t('columns.notes')}
              >
                <Input.TextArea rows={4} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Drawer>
    </div>
  )
}

