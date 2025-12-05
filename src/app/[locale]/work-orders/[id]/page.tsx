'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useRouter } from '@/navigation'
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
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, MoreOutlined, SearchOutlined, FilterOutlined, CheckCircleOutlined, UploadOutlined, FileTextOutlined, ArrowLeftOutlined, MessageOutlined } from '@ant-design/icons'
import { getFileUrl } from '@/lib/utils'
import dayjs from 'dayjs'
import { useTranslations } from 'next-intl'

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
    const [uploadingFile, setUploadingFile] = useState<string | null>(null)

    // 查看文件 Modal 状态
    const [viewModalVisible, setViewModalVisible] = useState(false)
    const [currentViewFiles, setCurrentViewFiles] = useState<string[]>([])

    const t = useTranslations('WorkOrder')
    const tCommon = useTranslations('Common')
    const tApplicant = useTranslations('Applicant')

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
            message.error(t('messages.fetchDetailError'))
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
            message.error(tApplicant('messages.fetchError'))
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
                message.success(tApplicant('messages.submitSuccess'))
            } else {
                // 新增
                const { error } = await supabase
                    .from('applicants')
                    .insert([applicantData])

                if (error) throw error
                message.success(tApplicant('messages.submitSuccess'))
            }

            setApplicantDrawerVisible(false)
            fetchApplicants()
        } catch (error) {
            console.error('提交应聘者信息失败:', error)
            message.error(tApplicant('messages.submitError'))
        }
    }

    // 删除应聘者
    const handleDeleteApplicant = (applicantId: string) => {
        Modal.confirm({
            title: tCommon('confirmDelete'),
            content: tApplicant('messages.confirmDelete'),
            okText: tCommon('confirm'),
            cancelText: tCommon('cancel'),
            onOk: async () => {
                try {
                    const { error } = await supabase
                        .from('applicants')
                        .delete()
                        .eq('id', applicantId)

                    if (error) throw error
                    message.success(tApplicant('messages.deleteSuccess'))
                    fetchApplicants()
                } catch (error) {
                    console.error('删除应聘者失败:', error)
                    message.error(tApplicant('messages.deleteError'))
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
    const handleViewFiles = (urls: string[]) => {
        if (!urls || urls.length === 0) {
            message.warning(t('messages.noFileWarning'))
            return
        }
        setCurrentViewFiles(urls)
        setViewModalVisible(true)
    }

    // 上传文件
    const handleUploadFile = async (file: File, field: string, applicantId: string) => {
        const uploadKey = `${applicantId}-${field}`
        setUploadingFile(uploadKey)
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

            message.success(t('messages.uploadSuccess'))
            fetchApplicants() // 刷新列表
        } catch (error) {
            console.error('上传失败:', error)
            message.error(t('messages.uploadError'))
        } finally {
            setUploadingFile(null)
        }
    }

    // 获取状态标签
    const getStatusTag = (status?: string) => {
        if (!status) return '-'
        const statusConfig: Record<string, { color: string, text: string }> = {
            '待面试': { color: 'blue', text: t('status.pending') },
            '面试中': { color: 'orange', text: t('status.interviewing') },
            '已通过': { color: 'green', text: t('status.passed') },
            '已拒绝': { color: 'red', text: t('status.rejected') },
            '培训中': { color: 'cyan', text: t('status.training') },
            '已完成': { color: 'purple', text: t('status.completed') }
        }
        // Try to match by key or text if status is already localized (though it shouldn't be in DB ideally)
        // For now assuming DB has Chinese status strings as keys
        const config = statusConfig[status] || { color: 'default', text: status }
        return <Tag color={config.color}>{config.text}</Tag>
    }

    if (!canAccessTickets) {
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
            <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => router.back()}
                style={{ marginBottom: 16 }}
            >
                {tCommon('back')}
            </Button>

            {/* 工单信息卡片 */}
            <Card title={t('detail.title')} style={{ marginBottom: 16 }}>
                <Descriptions bordered column={2}>
                    <Descriptions.Item label={t('columns.name')}>{ticket?.name}</Descriptions.Item>
                    <Descriptions.Item label={t('columns.companyName')}>{company?.name}</Descriptions.Item>
                    <Descriptions.Item label={t('form.position')}>{ticket?.position}</Descriptions.Item>
                    <Descriptions.Item label={t('form.recruitCount')}>{ticket?.recruit_count}人</Descriptions.Item>
                    <Descriptions.Item label={t('form.salary')}>{ticket?.salary}</Descriptions.Item>
                    <Descriptions.Item label={t('form.workTime')}>{ticket?.work_time}</Descriptions.Item>
                    <Descriptions.Item label={t('form.restDays')}>{ticket?.rest_days}</Descriptions.Item>
                    <Descriptions.Item label={t('columns.owner')}>
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
                                    {t('actions.chat')}
                                </Button>
                            )}
                        </Space>
                    </Descriptions.Item>
                    <Descriptions.Item label={t('form.benefits')} span={2}>{ticket?.benefits}</Descriptions.Item>
                </Descriptions>
            </Card>

            {/* 应聘者列表 - 仅日方员工可见 */}
            {!isChineseEmployee && (
                <Card
                    title={t('detail.applicantList')}
                    extra={
                        isAdmin && (
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={handleAddApplicant}
                            >
                                {tApplicant('add')}
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
                                                    {tCommon('edit')}
                                                </Button>
                                                <Button
                                                    danger
                                                    icon={<DeleteOutlined />}
                                                    onClick={() => handleDeleteApplicant(applicant.id)}
                                                >
                                                    {tCommon('delete')}
                                                </Button>
                                            </Space>
                                        )}
                                        <div style={{ clear: 'both' }}></div>

                                        <Row gutter={[16, 16]}>
                                            <Col xs={24} sm={12} md={8}>
                                                <div><strong>{tApplicant('form.name')}：</strong>{applicant.real_name || applicant.nickname}</div>
                                            </Col>
                                            <Col xs={24} sm={12} md={8}>

                                            </Col >
                                            <Col xs={24} sm={12} md={8}>
                                                <div><strong>{tApplicant('form.gender')}：</strong>{applicant.gender === 'male' ? tApplicant('gender.male') : applicant.gender === 'female' ? tApplicant('gender.female') : applicant.gender || '-'}</div>
                                            </Col>
                                            <Col xs={24} sm={12} md={8}>
                                                <div><strong>{tApplicant('form.birthDate')}：</strong>{applicant.birth_date}</div>
                                            </Col>
                                            <Col xs={24} sm={12} md={8}>
                                                <div><strong>{tApplicant('form.householdLocation')}：</strong>{applicant.household_location}</div>
                                            </Col>
                                            <Col xs={24} sm={12} md={8}>
                                                <div><strong>{tApplicant('form.currentResidence')}：</strong>{applicant.current_residence}</div>
                                            </Col>
                                            <Col xs={24} sm={12} md={8}>
                                                <div><strong>{tApplicant('form.contact')}：</strong>{applicant.phone || applicant.contact}</div>
                                            </Col>
                                            <Col xs={24} sm={12} md={8}>
                                                <div><strong>{tApplicant('form.wechat')}：</strong>{applicant.wechat}</div>
                                            </Col>
                                            <Col xs={24} sm={12} md={8}>
                                                <div><strong>{tApplicant('form.emergencyContact')}：</strong>{applicant.emergency_contact}</div>
                                            </Col>
                                            <Col xs={24} sm={12} md={8}>
                                                <div><strong>{tApplicant('form.emergencyPhone')}：</strong>{applicant.emergency_phone}</div>
                                            </Col>
                                            <Col xs={24} sm={12} md={8}>
                                                <div>
                                                    <strong>{tApplicant('form.owner')}：</strong>
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
                                                                {t('actions.chat')}
                                                            </Button>
                                                        )}
                                                    </Space>
                                                </div>
                                            </Col>
                                        </Row >

                                        <div style={{ marginTop: 16 }}>
                                            <h4>{t('detail.documents')}</h4>
                                            <Row gutter={[16, 16]}>
                                                {[
                                                    { label: tApplicant('documents.resume'), field: 'resume' },
                                                    { label: tApplicant('documents.passport'), field: 'passport' },
                                                    { label: tApplicant('documents.householdBook'), field: 'household_book' },
                                                    { label: tApplicant('documents.idCard'), field: 'id_card' },
                                                    { label: tApplicant('documents.photo2inch'), field: 'photo_2inch' },
                                                    { label: tApplicant('documents.creditReport'), field: 'credit_report' },
                                                    { label: tApplicant('documents.noCrimeCert'), field: 'no_crime_cert' },
                                                    { label: tApplicant('documents.nationalCert'), field: 'national_cert' },
                                                    { label: tApplicant('documents.provincialCert'), field: 'provincial_cert' },
                                                    { label: tApplicant('documents.employmentContract'), field: 'employment_contract' },
                                                    { label: tApplicant('documents.japanAgencyContract'), field: 'japan_agency_contract' },
                                                    { label: tApplicant('documents.immigrationMaterials'), field: 'immigration_materials' },
                                                ].map(({ label, field }) => {
                                                    // customers表的文档字段是数组类型
                                                    const fieldValue = applicant[field as keyof Customer] as string[] | undefined
                                                    const hasFile = fieldValue && fieldValue.length > 0
                                                    const isUploading = uploadingFile === `${applicant.id}-${field}`
                                                    return (
                                                        <Col xs={24} sm={12} md={8} key={field}>
                                                            <div><strong>{label}：</strong>
                                                                <Space>
                                                                    <Button
                                                                        type="link"
                                                                        icon={<FileTextOutlined />}
                                                                        onClick={() => {
                                                                            if (hasFile) {
                                                                                handleViewFiles(fieldValue)
                                                                            }
                                                                        }}
                                                                        disabled={!hasFile}
                                                                    >
                                                                        {t('actions.view')}{hasFile ? `(${fieldValue.length})` : ''}
                                                                    </Button>
                                                                    {isAdmin && (
                                                                        <Upload
                                                                            showUploadList={false}
                                                                            customRequest={({ file }) => handleUploadFile(file as File, field, applicant.id)}
                                                                            accept=".pdf,.jpg,.jpeg,.png"
                                                                            disabled={isUploading}
                                                                        >
                                                                            <Button
                                                                                type="link"
                                                                                icon={<UploadOutlined />}
                                                                                size="small"
                                                                                loading={isUploading}
                                                                            >
                                                                                {isUploading ? t('actions.uploading') : t('actions.upload')}
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
                                    </div >
                                )
                            }))}
                        />
                    ) : (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                            {t('detail.noApplicant')}
                        </div>
                    )}
                </Card >
            )
            }

            {/* 添加/编辑应聘者Drawer */}
            <Drawer
                title={editingApplicant ? tApplicant('edit') : tApplicant('add')}
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
                        label={tApplicant('form.name')}
                        rules={[{ required: true, message: tApplicant('form.namePlaceholder') }]}
                    >
                        <Input placeholder={tApplicant('form.namePlaceholder')} />
                    </Form.Item>

                    <Form.Item
                        name="gender"
                        label={tApplicant('form.gender')}
                        rules={[{ required: true, message: tApplicant('form.genderPlaceholder') }]}
                    >
                        <Select placeholder={tApplicant('form.genderPlaceholder')}>
                            <Option value="male">{tApplicant('gender.male')}</Option>
                            <Option value="female">{tApplicant('gender.female')}</Option>
                            <Option value="other">{tApplicant('gender.other')}</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="birth_date"
                        label={tApplicant('form.birthDate')}
                    >
                        <DatePicker style={{ width: '100%' }} placeholder={tApplicant('form.birthDatePlaceholder')} />
                    </Form.Item>

                    <Form.Item
                        name="household_location"
                        label={tApplicant('form.householdLocation')}
                    >
                        <Input placeholder={tApplicant('form.householdLocationPlaceholder')} />
                    </Form.Item>

                    <Form.Item
                        name="current_residence"
                        label={tApplicant('form.currentResidence')}
                    >
                        <Input placeholder={tApplicant('form.currentResidencePlaceholder')} />
                    </Form.Item>

                    <Form.Item
                        name="contact"
                        label={tApplicant('form.contact')}
                        rules={[{ required: true, message: tApplicant('form.contactPlaceholder') }]}
                    >
                        <Input placeholder={tApplicant('form.contactPlaceholder')} />
                    </Form.Item>

                    <Form.Item
                        name="wechat"
                        label={tApplicant('form.wechat')}
                    >
                        <Input placeholder={tApplicant('form.wechatPlaceholder')} />
                    </Form.Item>

                    <Form.Item
                        name="emergency_contact"
                        label={tApplicant('form.emergencyContact')}
                    >
                        <Input placeholder={tApplicant('form.emergencyContactPlaceholder')} />
                    </Form.Item>

                    <Form.Item
                        name="emergency_phone"
                        label={tApplicant('form.emergencyPhone')}
                    >
                        <Input placeholder={tApplicant('form.emergencyPhonePlaceholder')} />
                    </Form.Item>

                    <Form.Item
                        name="status"
                        label={tApplicant('form.status')}
                    >
                        <Select placeholder={tApplicant('form.statusPlaceholder')}>
                            <Option value="待面试">{t('status.pending')}</Option>
                            <Option value="面试中">{t('status.interviewing')}</Option>
                            <Option value="已通过">{t('status.passed')}</Option>
                            <Option value="已拒绝">{t('status.rejected')}</Option>
                            <Option value="培训中">{t('status.training')}</Option>
                            <Option value="已完成">{t('status.completed')}</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit">
                                {editingApplicant ? tApplicant('form.update') : tApplicant('form.add')}
                            </Button>
                            <Button onClick={() => setApplicantDrawerVisible(false)}>
                                {tApplicant('form.cancel')}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>

            </Drawer>

            {/* 查看文件 Modal */}
            <Modal
                open={viewModalVisible}
                title={t('fileViewer')}
                footer={null}
                onCancel={() => setViewModalVisible(false)}
                width={800}
            >
                <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                    {currentViewFiles.map((url, index) => (
                        <div
                            key={index}
                            style={{
                                padding: '12px',
                                borderBottom: '1px solid #f0f0f0',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <FileTextOutlined style={{ marginRight: 8, fontSize: '16px', color: '#1890ff' }} />
                                <span style={{ wordBreak: 'break-all' }}>
                                    {url.split('/').pop()}
                                </span>
                            </div>
                            <Button
                                type="link"
                                onClick={() => window.open(getFileUrl(url), '_blank')}
                            >
                                查看
                            </Button>
                        </div >
                    ))
                    }
                </div >
            </Modal >
        </div >
    )
}
