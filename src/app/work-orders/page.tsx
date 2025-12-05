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
    Space
} from 'antd'
import {
    SearchOutlined,
    ReloadOutlined,
    EyeOutlined,
    PlusOutlined,
    MessageOutlined
} from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { supabase, Ticket, Company } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

const { Option } = Select
const { TextArea } = Input

export default function WorkOrdersPage() {
    const router = useRouter()
    const { canAccessTickets, isChineseEmployee, isJapaneseEmployee, user } = useAuth()
    const [form] = Form.useForm()
    const [createForm] = Form.useForm()
    const [loading, setLoading] = useState(false)
    const [tickets, setTickets] = useState<Ticket[]>([])
    const [companies, setCompanies] = useState<Company[]>([])
    const [createDrawerVisible, setCreateDrawerVisible] = useState(false)

    // 搜索状态
    const [searchCompanyName, setSearchCompanyName] = useState('')
    const [searchTicketName, setSearchTicketName] = useState('')
    const [searchOwnerName, setSearchOwnerName] = useState('')

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
            message.error('获取企业列表失败')
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

            // 应用搜索条件
            if (searchCompanyName) {
                query = query.ilike('companies.name', `%${searchCompanyName}%`)
            }
            if (searchTicketName) {
                query = query.ilike('name', `%${searchTicketName}%`)
            }
            if (searchOwnerName) {
                query = query.ilike('owner_name', `%${searchOwnerName}%`)
            }

            const { data, error } = await query

            if (error) throw error
            setTickets(data || [])
        } catch (error) {
            console.error('获取工单列表失败:', error)
            message.error('获取工单列表失败')
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
                    name: values.name,
                    position: values.position,
                    recruit_count: values.recruit_count,
                    salary: values.salary,
                    work_time: values.work_time,
                    rest_days: values.rest_days,
                    benefits: values.benefits,
                    owner_id: user?.id,
                    owner_name: user?.username
                }])

            if (error) throw error
            message.success('创建工单成功')
            setCreateDrawerVisible(false)
            fetchTickets()
        } catch (error) {
            console.error('创建工单失败:', error)
            message.error('创建工单失败')
        }
    }

    const columns = [
        {
            title: '创建时间',
            dataIndex: 'created_at',
            key: 'created_at',
            width: 180,
            align: 'center' as const,
            render: (text: string) => new Date(text).toLocaleString('zh-CN')
        },
        {
            title: '企业名称',
            dataIndex: ['companies', 'name'],
            key: 'company_name',
            width: 150,
            align: 'center' as const,
        },
        {
            title: '工单名称',
            dataIndex: 'name',
            key: 'name',
            width: 150,
            align: 'center' as const,
        },
        {
            title: '岗位名称',
            dataIndex: 'position',
            key: 'position',
            width: 120,
            align: 'center' as const,
        },
        {
            title: '招聘人数',
            dataIndex: 'recruit_count',
            key: 'recruit_count',
            width: 100,
            align: 'center' as const,
            render: (count: number) => `${count}人`
        },
        {
            title: '负责人',
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
                            聊天
                        </Button>
                    )}
                </Space>
            )
        },
        {
            title: '操作',
            key: 'action',
            width: 100,
            align: 'center' as const,
            render: (_: any, record: Ticket) => (
                <Button
                    type="link"
                    icon={<EyeOutlined />}
                    onClick={() => handleViewDetail(record.id)}
                >
                    查看详情
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
                    <h2>工单列表</h2>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleCreateTicket}
                    >
                        创建工单
                    </Button>
                </div>

                {/* 搜索区域 */}
                <Card style={{ marginBottom: 16 }}>
                    <Form
                        form={form}
                        layout="inline"
                        style={{ width: '100%' }}
                    >
                        <Form.Item label="企业名称" style={{ marginBottom: 16 }}>
                            <Input
                                placeholder="请输入企业名称"
                                prefix={<SearchOutlined />}
                                value={searchCompanyName}
                                onChange={(e) => setSearchCompanyName(e.target.value)}
                                allowClear
                                style={{ width: 200 }}
                            />
                        </Form.Item>
                        <Form.Item label="工单名称" style={{ marginBottom: 16 }}>
                            <Input
                                placeholder="请输入工单名称"
                                prefix={<SearchOutlined />}
                                value={searchTicketName}
                                onChange={(e) => setSearchTicketName(e.target.value)}
                                allowClear
                                style={{ width: 200 }}
                            />
                        </Form.Item>
                        <Form.Item label="负责人" style={{ marginBottom: 16 }}>
                            <Input
                                placeholder="请输入负责人姓名"
                                prefix={<SearchOutlined />}
                                value={searchOwnerName}
                                onChange={(e) => setSearchOwnerName(e.target.value)}
                                allowClear
                                style={{ width: 200 }}
                            />
                        </Form.Item>
                        <Form.Item style={{ marginBottom: 16 }}>
                            <Button icon={<ReloadOutlined />} onClick={handleResetSearch}>
                                重置筛选
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
                    pagination={{
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total) => `共 ${total} 项数据`,
                        pageSizeOptions: ['10', '20', '50', '100'],
                        defaultPageSize: 20,
                    }}
                    scroll={{ x: 'max-content' }}
                />
            </Card>

            {/* 创建工单Drawer */}
            <Drawer
                title="创建工单"
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
                        label="选择企业"
                        rules={[{ required: true, message: '请选择企业' }]}
                    >
                        <Select placeholder="请选择企业" showSearch optionFilterProp="children">
                            {companies.map(company => (
                                <Option key={company.id} value={company.id}>{company.name}</Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="name"
                        label="工单名称"
                        rules={[{ required: true, message: '请输入工单名称' }]}
                    >
                        <Input placeholder="请输入工单名称" />
                    </Form.Item>

                    <Form.Item
                        name="position"
                        label="岗位名称"
                        rules={[{ required: true, message: '请输入岗位名称' }]}
                    >
                        <Input placeholder="请输入岗位名称" />
                    </Form.Item>

                    <Form.Item
                        name="recruit_count"
                        label="招聘人数"
                        rules={[{ required: true, message: '请输入招聘人数' }]}
                    >
                        <InputNumber
                            min={1}
                            placeholder="请输入招聘人数"
                            style={{ width: '100%' }}
                        />
                    </Form.Item>

                    <Form.Item
                        name="salary"
                        label="薪资"
                        rules={[{ required: true, message: '请输入薪资' }]}
                    >
                        <Input placeholder="请输入薪资" />
                    </Form.Item>

                    <Form.Item
                        name="work_time"
                        label="工作时间"
                        rules={[{ required: true, message: '请输入工作时间' }]}
                    >
                        <Input placeholder="请输入工作时间" />
                    </Form.Item>

                    <Form.Item
                        name="rest_days"
                        label="休息天数"
                        rules={[{ required: true, message: '请输入休息天数' }]}
                    >
                        <Input placeholder="请输入休息天数" />
                    </Form.Item>

                    <Form.Item
                        name="benefits"
                        label="工作待遇"
                        rules={[{ required: true, message: '请输入工作待遇' }]}
                    >
                        <TextArea rows={4} placeholder="请输入工作待遇" />
                    </Form.Item>

                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit">
                                创建
                            </Button>
                            <Button onClick={() => setCreateDrawerVisible(false)}>
                                取消
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Drawer>
        </div>
    )
}
