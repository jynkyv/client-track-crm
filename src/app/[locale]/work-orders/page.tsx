'use client'

import { useState, useEffect } from 'react'
import {
    Table,
    Button,
    Form,
    Input,
    Select,
    Card,
    Tag,
    message,
    Drawer,
    InputNumber,
    Space,
    Radio
} from 'antd'
import {
    SearchOutlined,
    ReloadOutlined,
    EyeOutlined,
    PlusOutlined,
    MessageOutlined
} from '@ant-design/icons'
import { useRouter, Link } from '@/navigation'
import { supabase, Ticket, Company } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslations } from 'next-intl'

const { Option } = Select
const { TextArea } = Input

const INDUSTRIES = [
    { value: '農業・林業関係', label: '農業・林業関係' },
    { value: '漁業関係', label: '漁業関係' },
    { value: '建設関係', label: '建設関係' },
    { value: '食品製造関係', label: '食品製造関係' },
    { value: '繊維・衣服関係', label: '繊維・衣服関係' },
    { value: '機械・金属関係', label: '機械・金属関係' },
]

export default function WorkOrdersPage() {
    const router = useRouter()
    const { canAccessTickets, isChineseEmployee, isJapaneseEmployee, user } = useAuth()
    const [form] = Form.useForm()
    const [createForm] = Form.useForm()
    const [loading, setLoading] = useState(false)
    const [tickets, setTickets] = useState<Ticket[]>([])
    const [applicantCounts, setApplicantCounts] = useState<Record<string, number>>({})
    const [companies, setCompanies] = useState<Company[]>([])
    const [createDrawerVisible, setCreateDrawerVisible] = useState(false)
    const t = useTranslations('WorkOrder')
    const tCommon = useTranslations('Common')
    const tQA = useTranslations('WorkOrderQA')

    // 搜索状态
    const [searchCompanyName, setSearchCompanyName] = useState('')
    const [searchTicketName, setSearchTicketName] = useState('')
    const [searchOwnerName, setSearchOwnerName] = useState('')
    // 签证状态统计
    const [visaStats, setVisaStats] = useState<Record<string, { pending: number, completed: number }>>({})
    // 待回复问题数量
    const [pendingQuestionCounts, setPendingQuestionCounts] = useState<Record<string, number>>({})

    // 获取企业列表
    const fetchCompanies = async () => {
        try {
            const { data, error } = await supabase
                .from('companies')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error
            setCompanies(data || [])
        } catch (error) {
            console.error('获取企业列表失败:', error)
            message.error(t('messages.fetchCompaniesError'))
        }
    }

    // 获取工单列表
    const fetchTickets = async () => {
        setLoading(true)
        try {
            let query = supabase
                .from('work_orders')
                .select(`
          *,
          companies:company_id (
            name
          )
        `)
                .order('created_at', { ascending: false })

            // 日方员工只能看到自己创建的工单
            if (isJapaneseEmployee && user?.id) {
                query = query.eq('owner_id', user.id)
            }

            if (searchTicketName) {
                query = query.eq('industry', searchTicketName)
            }
            // 负责人搜索（数据库层面）
            if (searchOwnerName) {
                query = query.ilike('owner_name', `%${searchOwnerName}%`)
            }

            const { data, error } = await query

            if (error) throw error

            // 前端过滤：企业名称搜索（因为 Supabase 关联查询不支持 ilike 过滤关联表字段）
            let filteredData = data || []
            if (searchCompanyName && filteredData.length > 0) {
                filteredData = filteredData.filter((ticket: any) => {
                    const companyName = ticket.companies?.name || ''
                    return companyName.toLowerCase().includes(searchCompanyName.toLowerCase())
                })
            }

            // 获取每个工单的已投递人数和签证状态统计
            if (filteredData && filteredData.length > 0) {
                const workOrderIds = filteredData.map((t: Ticket) => t.id)
                const { data: customers, error: countError } = await supabase
                    .from('customers')
                    .select('work_order_id, stage2_status, visa_status')
                    .in('work_order_id', workOrderIds)

                const counts: Record<string, number> = {}
                const stats: Record<string, { pending: number, completed: number }> = {}

                if (!countError && customers) {
                    customers.forEach((c: { work_order_id: string, stage2_status?: string, visa_status?: string }) => {
                        counts[c.work_order_id] = (counts[c.work_order_id] || 0) + 1

                        // 只统计培训中状态的客户签证状态
                        if (c.stage2_status === '培训中') {
                            if (!stats[c.work_order_id]) {
                                stats[c.work_order_id] = { pending: 0, completed: 0 }
                            }
                            if (c.visa_status === 'completed') {
                                stats[c.work_order_id].completed++
                            } else {
                                stats[c.work_order_id].pending++
                            }
                        }
                    })
                    setApplicantCounts(counts)
                    setVisaStats(stats)
                }

                // 获取每个工单的待回复问题数量
                const { data: questionsData, error: questionsError } = await supabase
                    .from('work_order_questions')
                    .select('work_order_id, is_answered')
                    .in('work_order_id', workOrderIds)
                    .eq('is_answered', false)

                const questionCounts: Record<string, number> = {}
                if (!questionsError && questionsData) {
                    questionsData.forEach((q: { work_order_id: string }) => {
                        questionCounts[q.work_order_id] = (questionCounts[q.work_order_id] || 0) + 1
                    })
                    setPendingQuestionCounts(questionCounts)
                }

                // 排序：待回复问题优先 > 待办签证 > 创建时间
                const sortedData = [...filteredData].sort((a: Ticket, b: Ticket) => {
                    const aQuestions = questionCounts[a.id] || 0
                    const bQuestions = questionCounts[b.id] || 0
                    if (aQuestions !== bQuestions) return bQuestions - aQuestions // 问题优先

                    const aPending = stats[a.id]?.pending || 0
                    const bPending = stats[b.id]?.pending || 0
                    return bPending - aPending // 签证次之
                })
                setTickets(sortedData)
            } else {
                setTickets(filteredData || [])
            }
        } catch (error) {
            console.error('获取工单列表失败:', error)
            message.error(t('messages.fetchError'))
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (canAccessTickets) {
            fetchCompanies()
            fetchTickets()
        }
    }, [canAccessTickets])

    useEffect(() => {
        if (canAccessTickets) {
            fetchTickets()
        }
    }, [searchCompanyName, searchTicketName, searchOwnerName])

    // 重置搜索
    const handleResetSearch = () => {
        setSearchCompanyName('')
        setSearchTicketName('')
        setSearchOwnerName('')
        form.resetFields()
    }

    // 查看详情
    const handleViewDetail = (ticketId: string) => {
        router.push(`/work-orders/${ticketId}`)
    }

    // 创建工单
    const handleCreateTicket = () => {
        createForm.resetFields()
        setCreateDrawerVisible(true)
    }

    // 提交创建工单
    const handleCreateSubmit = async (values: any) => {
        try {
            const { error } = await supabase
                .from('work_orders')
                .insert([{
                    company_id: values.company_id,
                    industry: values.industry,
                    position: values.position,
                    recruit_count: values.recruit_count,
                    salary: values.salary,
                    work_time: values.work_time,
                    rest_days: values.rest_days,
                    benefits: values.benefits,
                    accommodation_type: values.accommodation_type,
                    accommodation_address: values.accommodation_address,
                    owner_id: user?.id,
                    owner_name: user?.username
                }])

            if (error) throw error
            message.success(t('messages.createSuccess'))
            setCreateDrawerVisible(false)
            fetchTickets()
        } catch (error) {
            console.error('创建工单失败:', error)
            message.error(t('messages.createError'))
        }
    }

    const columns = [
        {
            title: t('columns.createdAt'),
            dataIndex: 'created_at',
            key: 'created_at',
            width: 180,
            align: 'center' as const,
            render: (text: string) => new Date(text).toLocaleString('zh-CN')
        },
        {
            title: t('columns.companyName'),
            dataIndex: ['companies', 'name'],
            key: 'company_name',
            width: 150,
            align: 'center' as const,
            render: (text: string, record: Ticket) => (
                <Link href={`/companies/${record.company_id}`} style={{ color: '#1890ff', cursor: 'pointer' }}>
                    {text}
                </Link>
            )
        },
        {
            title: t('columns.ticketName'),
            dataIndex: 'industry',
            key: 'industry',
            width: 150,
            align: 'center' as const,
            render: (text: string) => <Tag color="blue">{text || '-'}</Tag>
        },
        {
            title: t('columns.position'),
            dataIndex: 'position',
            key: 'position',
            width: 120,
            align: 'center' as const,
        },
        {
            title: t('columns.recruitCount'),
            dataIndex: 'recruit_count',
            key: 'recruit_count',
            width: 100,
            align: 'center' as const,
            render: (count: number) => `${count}人`
        },
        {
            title: t('columns.applicantCount'),
            dataIndex: 'id',
            key: 'applicant_count',
            width: 100,
            align: 'center' as const,
            render: (id: string) => `${applicantCounts[id] || 0}人`
        },
        // 待回复问题列 - 仅日方员工和管理员可见
        ...(!isChineseEmployee ? [{
            title: tQA('pendingQuestions'),
            dataIndex: 'id',
            key: 'pending_questions',
            width: 120,
            align: 'center' as const,
            render: (id: string) => {
                const count = pendingQuestionCounts[id] || 0
                if (count === 0) {
                    return <span style={{ color: '#999' }}>-</span>
                }
                return <Tag color="red">{count}{tQA('pendingAnswer')}</Tag>
            }
        }] : []),
        // 签证状态列 - 仅日方员工和管理员可见
        ...(!isChineseEmployee ? [{
            title: t('columns.visaStatus'),
            dataIndex: 'id',
            key: 'visa_status',
            width: 150,
            align: 'center' as const,
            render: (id: string) => {
                const stat = visaStats[id]
                if (!stat || (stat.pending === 0 && stat.completed === 0)) {
                    return <span style={{ color: '#999' }}>-</span>
                }
                return (
                    <Space>
                        {stat.pending > 0 && <Tag color="orange">{stat.pending}{t('visa.pendingUnit')}</Tag>}
                        {stat.completed > 0 && <Tag color="green">{stat.completed}{t('visa.completedUnit')}</Tag>}
                    </Space>
                )
            }
        }] : []),
        {
            title: t('columns.owner'),
            dataIndex: 'owner_name',
            key: 'owner_name',
            width: 150,
            align: 'center' as const,
            render: (name: string, record: Ticket) => (
                <Space>
                    <span>{name || '-'}</span>
                    {name && record.owner_id && record.owner_id !== user?.id && (
                        <Button
                            type="link"
                            size="small"
                            icon={<MessageOutlined />}
                            onClick={(e) => {
                                e.stopPropagation()
                                if (typeof window !== 'undefined' && (window as any).openChat) {
                                    (window as any).openChat(record.owner_id, record.owner_name)
                                }
                            }}
                        >
                            {t('actions.chat')}
                        </Button>
                    )}
                </Space>
            )
        },
        {
            title: t('columns.actions'),
            key: 'action',
            width: 100,
            align: 'center' as const,
            render: (_: any, record: Ticket) => (
                <Button
                    type="link"
                    icon={<EyeOutlined />}
                    onClick={() => handleViewDetail(record.id)}
                >
                    {t('actions.viewDetail')}
                </Button>
            )
        }
    ]

    if (!canAccessTickets) {
        return (
            <Card>
                <div style={{ textAlign: 'center', padding: '50px' }}>
                    <h2>权限不足</h2>
                    <p>您没有权限访问此页面</p>
                </div>
            </Card>
        )
    }

    return (
        <div>
            <Card>
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2>{t('title')}</h2>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleCreateTicket}
                    >
                        {t('create')}
                    </Button>
                </div>

                {/* 搜索区域 */}
                <Card style={{ marginBottom: 16 }}>
                    <Form
                        form={form}
                        layout="inline"
                        style={{ width: '100%' }}
                    >
                        <Form.Item label={t('search.companyName')} style={{ marginBottom: 16 }}>
                            <Input
                                placeholder={t('search.companyNamePlaceholder')}
                                prefix={<SearchOutlined />}
                                value={searchCompanyName}
                                onChange={(e) => setSearchCompanyName(e.target.value)}
                                allowClear
                                style={{ width: 200 }}
                            />
                        </Form.Item>
                        <Form.Item label={t('search.ticketName')} style={{ marginBottom: 16 }}>
                            <Select
                                placeholder={t('search.ticketNamePlaceholder')}
                                value={searchTicketName}
                                onChange={setSearchTicketName}
                                allowClear
                                style={{ width: 200 }}
                            >
                                {INDUSTRIES.map(i => (
                                    <Option key={i.value} value={i.value}>{i.label}</Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <Form.Item label={t('search.owner')} style={{ marginBottom: 16 }}>
                            <Input
                                placeholder={t('search.ownerPlaceholder')}
                                prefix={<SearchOutlined />}
                                value={searchOwnerName}
                                onChange={(e) => setSearchOwnerName(e.target.value)}
                                allowClear
                                style={{ width: 200 }}
                            />
                        </Form.Item>
                        <Form.Item style={{ marginBottom: 16 }}>
                            <Button icon={<ReloadOutlined />} onClick={handleResetSearch}>
                                {tCommon('reset')}
                            </Button>
                        </Form.Item>
                    </Form>
                </Card>

                {/* 工单列表 */}
                <Table
                    columns={columns}
                    dataSource={tickets}
                    loading={loading}
                    rowKey="id"
                    rowClassName={(record) => {
                        const pending = pendingQuestionCounts[record.id] || 0
                        return pending > 0 ? 'pending-question-row' : ''
                    }}
                    pagination={{
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total) => `共 ${total} 项数据`,
                        pageSizeOptions: ['10', '20', '50', '100'],
                        defaultPageSize: 20,
                    }}
                    scroll={{ x: 'max-content' }}
                />
                <style jsx global>{`
                    .pending-question-row {
                        background-color: rgba(255, 0, 0, 0.08) !important;
                    }
                    .pending-question-row:hover > td {
                        background-color: rgba(255, 0, 0, 0.12) !important;
                    }
                `}</style>
            </Card>

            {/* 创建工单Drawer */}
            <Drawer
                title={t('title')}
                open={createDrawerVisible}
                onClose={() => setCreateDrawerVisible(false)}
                width={600}
                placement="right"
            >
                <Form
                    form={createForm}
                    layout="vertical"
                    onFinish={handleCreateSubmit}
                >
                    <Form.Item
                        name="company_id"
                        label={t('form.selectCompany')}
                        rules={[{ required: true, message: t('form.selectCompanyPlaceholder') }]}
                    >
                        <Select placeholder={t('form.selectCompanyPlaceholder')} showSearch optionFilterProp="children">
                            {companies.map(company => (
                                <Option key={company.id} value={company.id}>{company.name}</Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="industry"
                        label={t('form.ticketName')}
                        rules={[{ required: true, message: t('form.ticketNamePlaceholder') }]}
                    >
                        <Select placeholder={t('form.ticketNamePlaceholder')}>
                            {INDUSTRIES.map(i => (
                                <Option key={i.value} value={i.value}>{i.label}</Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="position"
                        label={t('form.position')}
                        rules={[{ required: true, message: t('form.positionPlaceholder') }]}
                    >
                        <Input placeholder={t('form.positionPlaceholder')} />
                    </Form.Item>

                    <Form.Item
                        name="recruit_count"
                        label={t('form.recruitCount')}
                        rules={[{ required: true, message: t('form.recruitCountPlaceholder') }]}
                    >
                        <InputNumber
                            min={1}
                            placeholder={t('form.recruitCountPlaceholder')}
                            style={{ width: '100%' }}
                        />
                    </Form.Item>

                    <Form.Item
                        name="salary"
                        label={t('form.salary')}
                        rules={[{ required: true, message: t('form.salaryPlaceholder') }]}
                    >
                        <Input placeholder={t('form.salaryPlaceholder')} />
                    </Form.Item>

                    <Form.Item
                        name="work_time"
                        label={t('form.workTime')}
                        rules={[{ required: true, message: t('form.workTimePlaceholder') }]}
                    >
                        <Input placeholder={t('form.workTimePlaceholder')} />
                    </Form.Item>

                    <Form.Item
                        name="rest_days"
                        label={t('form.restDays')}
                        rules={[{ required: true, message: t('form.restDaysPlaceholder') }]}
                    >
                        <Input placeholder={t('form.restDaysPlaceholder')} />
                    </Form.Item>

                    <Form.Item
                        name="benefits"
                        label={t('form.benefits')}
                        rules={[{ required: true, message: t('form.benefitsPlaceholder') }]}
                    >
                        <TextArea rows={4} placeholder={t('form.benefitsPlaceholder')} />
                    </Form.Item>

                    <Form.Item
                        name="accommodation_type"
                        label={t('form.accommodationType')}
                    >
                        <Radio.Group>
                            <Radio value="free">{t('form.accommodationFree')}</Radio>
                            <Radio value="paid">{t('form.accommodationPaid')}</Radio>
                        </Radio.Group>
                    </Form.Item>

                    <Form.Item
                        name="accommodation_address"
                        label={t('form.accommodationAddress')}
                    >
                        <Input placeholder={t('form.accommodationAddressPlaceholder')} />
                    </Form.Item>

                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit">
                                {t('form.create')}
                            </Button>
                            <Button onClick={() => setCreateDrawerVisible(false)}>
                                {t('form.cancel')}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Drawer>
        </div>
    )
}
