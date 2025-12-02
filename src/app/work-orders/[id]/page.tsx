'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, Ticket, Applicant, Company, Customer } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import {
    Card,
    Button,
    Row,
    Col,
    Descriptions,
    Form,
    Input,
    Select,
    Space,
    Modal,
    Drawer,
    message,
    DatePicker,
    Upload,
    Tabs,
    Tag
} from 'antd'
import {
    ArrowLeftOutlined,
    PlusOutlined,
    FileTextOutlined,
    EditOutlined,
    DeleteOutlined,
    MessageOutlined,
    UploadOutlined,
    FilePdfOutlined
} from '@ant-design/icons'
import { getFileUrl } from '@/lib/utils'
import dayjs from 'dayjs'

const { Option } = Select
const { TextArea } = Input

export default function WorkOrderDetailPage() {
    const params = useParams()
    const router = useRouter()
    const { user, isChineseEmployee, isJapaneseEmployee, isAdmin, canAccessTickets } = useAuth()
    const ticketId = params.id as string

    const [ticket, setTicket] = useState<Ticket | null>(null)
    const [company, setCompany] = useState<Company | null>(null)
    const [applicants, setApplicants] = useState<Customer[]>([])
    const [loading, setLoading] = useState(false)
    const [applicantDrawerVisible, setApplicantDrawerVisible] = useState(false)
    const [editingApplicant, setEditingApplicant] = useState<Customer | null>(null)
    const [applicantForm] = Form.useForm()
    const [ownerUserMap, setOwnerUserMap] = useState<Record<string, string>>({})

    // 获取工单详情
    const fetchTicketDetail = async () => {
        try {
            const { data, error } = await supabase
                .from('work_orders')
                .select('*')
                .eq('id', ticketId)
                .single()

            if (error) throw error
            setTicket(data)

            // 获取企业信息
            if (data.company_id) {
                const { data: companyData, error: companyError } = await supabase
                    .from('companies')
                    .select('*')
                    .eq('id', data.company_id)
                    .single()

                if (companyError) throw companyError
                setCompany(companyData)
            }
        } catch (error) {
            console.error('获取工单详情失败:', error)
            message.error('获取工单详情失败')
        }
    }

    // 获取应聘者列表（仅日方员工可访问）
    const fetchApplicants = async () => {
        // 中方员工无法获取应聘者列表
        if (isChineseEmployee) return

        setLoading(true)
        try {
            // 直接查询customers表，客户就是应聘者
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .eq('work_order_id', ticketId)
                .order('created_at', { ascending: false })

            if (error) throw error
            setApplicants(data || [])

            // 获取所有负责人的user_id
            const ownerNames = [...new Set(data?.map(a => a.owner).filter(Boolean) || [])]
            if (ownerNames.length > 0) {
                const { data: users } = await supabase
                    .from('users')
                    .select('id, username')
                    .in('username', ownerNames)

                const userMap: Record<string, string> = {}
                users?.forEach(u => {
                    userMap[u.username] = u.id
                })
                setOwnerUserMap(userMap)
            }
        } catch (error) {
            console.error('获取应聘者列表失败:', error)
            message.error('获取应聘者列表失败')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (ticketId) {
            fetchTicketDetail()
            fetchApplicants()
        }
    }, [ticketId])

    // 添加应聘者
    const handleAddApplicant = () => {
        setEditingApplicant(null)
        applicantForm.resetFields()
        setApplicantDrawerVisible(true)
    }

    // 编辑应聘者
    const handleEditApplicant = (applicant: Customer) => {
        setEditingApplicant(applicant)
        applicantForm.setFieldsValue({
            ...applicant,
            birth_date: applicant.birth_date ? dayjs(applicant.birth_date) : null
        })
        setApplicantDrawerVisible(true)
    }

    // 提交应聘者信息
    const handleApplicantSubmit = async (values: any) => {
        try {
            const applicantData = {
                work_order_id: ticketId,
                name: values.name,
                gender: values.gender,
                birth_date: values.birth_date ? values.birth_date.format('YYYY-MM-DD') : null,
                household_location: values.household_location,
                current_residence: values.current_residence,
                contact: values.contact,
                wechat: values.wechat,
                emergency_contact: values.emergency_contact,
                emergency_phone: values.emergency_phone,
                status: values.status,
                owner_id: user?.id,
                owner_name: user?.username
            }

            if (editingApplicant) {
                // 更新
                const { error } = await supabase
                    .from('applicants')
                    .update(applicantData)
                    .eq('id', editingApplicant.id)

                if (error) throw error
                message.success('更新应聘者信息成功')
            } else {
                // 新增
                const { error } = await supabase
                    .from('applicants')
                    .insert([applicantData])

                if (error) throw error
                message.success('添加应聘者成功')
            }

            setApplicantDrawerVisible(false)
            fetchApplicants()
        } catch (error) {
            console.error('提交应聘者信息失败:', error)
            message.error('提交应聘者信息失败')
        }
    }

    // 删除应聘者
    const handleDeleteApplicant = (applicantId: string) => {
        Modal.confirm({
            title: '确认删除',
            content: '确定要删除这个应聘者吗？此操作无法撤销。',
            okText: '确认',
            cancelText: '取消',
            onOk: async () => {
                try {
                    const { error } = await supabase
                        .from('applicants')
                        .delete()
                        .eq('id', applicantId)

                    if (error) throw error
                    message.success('删除成功')
                    fetchApplicants()
                } catch (error) {
                    console.error('删除应聘者失败:', error)
                    message.error('删除应聘者失败')
                }
            }
        })
    }

    // 查看PDF
    const handleViewPdf = (url?: string) => {
        if (url) {
            window.open(getFileUrl(url), '_blank')
        }
    }

    // 查看文件
    const handleViewFile = (url: string) => {
        if (!url) { // This check is technically redundant if caller ensures url is always string, but keeping for safety.
            message.warning('暂无文件')
            return
        }
        window.open(url, '_blank')
    }

    // 上传文件
    const handleUploadFile = async (file: File, field: string, applicantId: string) => {
        const formData = new FormData()
        formData.append('file', file)

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            })

            if (!response.ok) {
                throw new Error('上传失败')
            }

            const { url } = await response.json()

            // 更新数据库
            // 先获取当前文档列表
            const currentApplicant = applicants.find(a => a.id === applicantId)
            if (!currentApplicant) return

            const currentFiles = (currentApplicant[field as keyof Customer] as string[]) || []
            const newFiles = [...currentFiles, url]

            const { error } = await supabase
                .from('customers')
                .update({ [field]: newFiles })
                .eq('id', applicantId)

            if (error) throw error

            message.success('上传成功')
            fetchApplicants() // 刷新列表
        } catch (error) {
            console.error('上传失败:', error)
            message.error('上传失败')
        }
    }

    // 获取状态标签
    const getStatusTag = (status?: string) => {
        if (!status) return '-'
        const statusConfig: Record<string, { color: string, text: string }> = {
            '待面试': { color: 'blue', text: '待面试' },
            '面试中': { color: 'orange', text: '面试中' },
            '已通过': { color: 'green', text: '已通过' },
            '已拒绝': { color: 'red', text: '已拒绝' },
            '培训中': { color: 'cyan', text: '培训中' },
            '已完成': { color: 'purple', text: '已完成' }
        }
        const config = statusConfig[status] || { color: 'default', text: status }
        return <Tag color={config.color}>{config.text}</Tag>
    }

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
            <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => router.back()}
                style={{ marginBottom: 16 }}
            >
                返回
            </Button>

            {/* 工单信息卡片 */}
            <Card title="工单信息" style={{ marginBottom: 16 }}>
                <Descriptions bordered column={2}>
                    <Descriptions.Item label="工单名称">{ticket?.name}</Descriptions.Item>
                    <Descriptions.Item label="企业名称">{company?.name}</Descriptions.Item>
                    <Descriptions.Item label="岗位名称">{ticket?.position}</Descriptions.Item>
                    <Descriptions.Item label="招聘人数">{ticket?.recruit_count}人</Descriptions.Item>
                    <Descriptions.Item label="薪资">{ticket?.salary}</Descriptions.Item>
                    <Descriptions.Item label="工作时间">{ticket?.work_time}</Descriptions.Item>
                    <Descriptions.Item label="休息天数">{ticket?.rest_days}</Descriptions.Item>
                    <Descriptions.Item label="负责人">
                        <Space>
                            <span>{ticket?.owner_name || '-'}</span>
                            {ticket?.owner_id && ticket.owner_id !== user?.id && (
                                <Button
                                    type="link"
                                    size="small"
                                    icon={<MessageOutlined />}
                                    onClick={() => {
                                        if (typeof window !== 'undefined' && (window as any).openChat) {
                                            (window as any).openChat(ticket.owner_id, ticket.owner_name)
                                        }
                                    }}
                                >
                                    聊天
                                </Button>
                            )}
                        </Space>
                    </Descriptions.Item>
                    <Descriptions.Item label="工作待遇" span={2}>{ticket?.benefits}</Descriptions.Item>
                </Descriptions>
            </Card>

            {/* 应聘者列表 - 仅日方员工可见 */}
            {!isChineseEmployee && (
                <Card
                    title="应聘者列表"
                    extra={
                        isAdmin && (
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={handleAddApplicant}
                            >
                                添加应聘者
                            </Button>
                        )
                    }
                >
                    {applicants.length > 0 ? (
                        <Tabs
                            type="card"
                            items={applicants.map((applicant, index) => ({
                                key: applicant.id,
                                label: applicant.real_name || applicant.nickname || `应聘者${index + 1}`,
                                children: (
                                    <div style={{ padding: '16px 0' }}>
                                        {isAdmin && (
                                            <Space style={{ marginBottom: 16, float: 'right' }}>
                                                <Button
                                                    icon={<EditOutlined />}
                                                    onClick={() => handleEditApplicant(applicant)}
                                                >
                                                    编辑
                                                </Button>
                                                <Button
                                                    danger
                                                    icon={<DeleteOutlined />}
                                                    onClick={() => handleDeleteApplicant(applicant.id)}
                                                >
                                                    删除
                                                </Button>
                                            </Space>
                                        )}
                                        <div style={{ clear: 'both' }}></div>

                                        <Row gutter={[16, 16]}>
                                            <Col xs={24} sm={12} md={8}>
                                                <div><strong>姓名：</strong>{applicant.real_name || applicant.nickname}</div>
                                            </Col>
                                            <Col xs={24} sm={12} md={8}>
                                                <div><strong>客户状态：</strong>{getStatusTag(applicant.status)}</div>
                                            </Col>
                                            <Col xs={24} sm={12} md={8}>
                                                <div><strong>性别：</strong>{applicant.gender === 'male' ? '男' : applicant.gender === 'female' ? '女' : applicant.gender || '-'}</div>
                                            </Col>
                                            <Col xs={24} sm={12} md={8}>
                                                <div><strong>出生年月日：</strong>{applicant.birth_date}</div>
                                            </Col>
                                            <Col xs={24} sm={12} md={8}>
                                                <div><strong>户籍所在地：</strong>{applicant.household_location}</div>
                                            </Col>
                                            <Col xs={24} sm={12} md={8}>
                                                <div><strong>现居住地：</strong>{applicant.current_residence}</div>
                                            </Col>
                                            <Col xs={24} sm={12} md={8}>
                                                <div><strong>联系方式：</strong>{applicant.phone || applicant.contact}</div>
                                            </Col>
                                            <Col xs={24} sm={12} md={8}>
                                                <div><strong>实名微信号：</strong>{applicant.wechat}</div>
                                            </Col>
                                            <Col xs={24} sm={12} md={8}>
                                                <div><strong>紧急联系人：</strong>{applicant.emergency_contact}</div>
                                            </Col>
                                            <Col xs={24} sm={12} md={8}>
                                                <div><strong>紧急联系人电话：</strong>{applicant.emergency_phone}</div>
                                            </Col>
                                            <Col xs={24} sm={12} md={8}>
                                                <div>
                                                    <strong>负责人：</strong>
                                                    <Space>
                                                        <span>{applicant.owner || '-'}</span>
                                                        {applicant.owner && ownerUserMap[applicant.owner] && ownerUserMap[applicant.owner] !== user?.id && (
                                                            <Button
                                                                type="link"
                                                                size="small"
                                                                icon={<MessageOutlined />}
                                                                onClick={() => {
                                                                    if (typeof window !== 'undefined' && (window as any).openChat) {
                                                                        (window as any).openChat(ownerUserMap[applicant.owner], applicant.owner)
                                                                    }
                                                                }}
                                                            >
                                                                聊天
                                                            </Button>
                                                        )}
                                                    </Space>
                                                </div>
                                            </Col>
                                        </Row>

                                        <div style={{ marginTop: 16 }}>
                                            <h4>文档资料</h4>
                                            <Row gutter={[16, 16]}>
                                                {[
                                                    { label: '原始简历', field: 'resume' },
                                                    { label: '护照', field: 'passport' },
                                                    { label: '户口本', field: 'household_book' },
                                                    { label: '身份证', field: 'id_card' },
                                                    { label: '2寸照片', field: 'photo_2inch' },
                                                    { label: '征信报告', field: 'credit_report' },
                                                    { label: '无犯罪证明', field: 'no_crime_cert' },
                                                    { label: '国检证书', field: 'national_cert' },
                                                    { label: '省级考试证书', field: 'provincial_cert' },
                                                    { label: '雇佣合同', field: 'employment_contract' },
                                                    { label: '赴日中介合同', field: 'japan_agency_contract' },
                                                    { label: '入管局资料', field: 'immigration_materials' },
                                                ].map(({ label, field }) => {
                                                    // customers表的文档字段是数组类型
                                                    const fieldValue = applicant[field as keyof Customer] as string[] | undefined
                                                    const hasFile = fieldValue && fieldValue.length > 0
                                                    return (
                                                        <Col xs={24} sm={12} md={8} key={field}>
                                                            <div><strong>{label}：</strong>
                                                                <Space>
                                                                    <Button
                                                                        type="link"
                                                                        icon={<FileTextOutlined />}
                                                                        onClick={() => {
                                                                            if (hasFile) {
                                                                                // 打开第一个文件
                                                                                handleViewFile(fieldValue[0])
                                                                            }
                                                                        }}
                                                                        disabled={!hasFile}
                                                                    >
                                                                        查看{hasFile ? `(${fieldValue.length})` : ''}
                                                                    </Button>
                                                                    {isAdmin && (
                                                                        <Upload
                                                                            showUploadList={false}
                                                                            customRequest={({ file }) => handleUploadFile(file as File, field, applicant.id)}
                                                                            accept=".pdf,.jpg,.jpeg,.png"
                                                                        >
                                                                            <Button
                                                                                type="link"
                                                                                icon={<UploadOutlined />}
                                                                                size="small"
                                                                            >
                                                                                上传
                                                                            </Button>
                                                                        </Upload>
                                                                    )}
                                                                </Space>
                                                            </div>
                                                        </Col>
                                                    )
                                                })}
                                            </Row>
                                        </div>
                                    </div>
                                )
                            }))}
                        />
                    ) : (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                            暂无应聘者信息，请添加应聘者
                        </div>
                    )}
                </Card>
            )
            }

            {/* 添加/编辑应聘者Drawer */}
            <Drawer
                title={editingApplicant ? '编辑应聘者' : '添加应聘者'}
                open={applicantDrawerVisible}
                onClose={() => setApplicantDrawerVisible(false)}
                width={600}
                placement="right"
            >
                <Form
                    form={applicantForm}
                    layout="vertical"
                    onFinish={handleApplicantSubmit}
                >
                    <Form.Item
                        name="name"
                        label="姓名"
                        rules={[{ required: true, message: '请输入姓名' }]}
                    >
                        <Input placeholder="请输入姓名" />
                    </Form.Item>

                    <Form.Item
                        name="gender"
                        label="性别"
                        rules={[{ required: true, message: '请选择性别' }]}
                    >
                        <Select placeholder="请选择性别">
                            <Option value="male">男</Option>
                            <Option value="female">女</Option>
                            <Option value="other">其他</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="birth_date"
                        label="出生年月日"
                    >
                        <DatePicker style={{ width: '100%' }} placeholder="请选择出生日期" />
                    </Form.Item>

                    <Form.Item
                        name="household_location"
                        label="户籍所在地"
                    >
                        <Input placeholder="请输入户籍所在地" />
                    </Form.Item>

                    <Form.Item
                        name="current_residence"
                        label="现居住地"
                    >
                        <Input placeholder="请输入现居住地" />
                    </Form.Item>

                    <Form.Item
                        name="contact"
                        label="联系方式"
                        rules={[{ required: true, message: '请输入联系方式' }]}
                    >
                        <Input placeholder="请输入联系方式" />
                    </Form.Item>

                    <Form.Item
                        name="wechat"
                        label="实名微信号"
                    >
                        <Input placeholder="请输入实名微信号" />
                    </Form.Item>

                    <Form.Item
                        name="emergency_contact"
                        label="紧急联系人"
                    >
                        <Input placeholder="请输入紧急联系人" />
                    </Form.Item>

                    <Form.Item
                        name="emergency_phone"
                        label="紧急联系人电话"
                    >
                        <Input placeholder="请输入紧急联系人电话" />
                    </Form.Item>

                    <Form.Item
                        name="status"
                        label="状态"
                    >
                        <Select placeholder="请选择状态">
                            <Option value="待面试">待面试</Option>
                            <Option value="面试中">面试中</Option>
                            <Option value="已通过">已通过</Option>
                            <Option value="已拒绝">已拒绝</Option>
                            <Option value="培训中">培训中</Option>
                            <Option value="已完成">已完成</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit">
                                {editingApplicant ? '更新' : '添加'}
                            </Button>
                            <Button onClick={() => setApplicantDrawerVisible(false)}>
                                取消
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Drawer>
        </div >
    )
}
