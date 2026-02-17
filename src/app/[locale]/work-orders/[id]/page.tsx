'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Link } from '@/navigation'
import { supabase, Ticket, Applicant, Company, Customer, type DocumentFile, type WorkOrderQuestion, type WorkOrderAnswer } from '@/lib/supabase'
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
    Tag,
    Checkbox,
    Collapse,
    Dropdown
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, MoreOutlined, SearchOutlined, FilterOutlined, CheckCircleOutlined, UploadOutlined, FileTextOutlined, ArrowLeftOutlined, MessageOutlined, AlertOutlined, PictureOutlined, MailOutlined } from '@ant-design/icons'
import { getFileUrl } from '@/lib/utils'
import { generateUnionJoinApplication, generateTechnicalInternTrainingProgramAgreement } from '@/lib/pdfGenerator'
import dayjs from 'dayjs'
import { useTranslations, useLocale } from 'next-intl'

const { Option } = Select
const { TextArea } = Input

const INDUSTRIES = [
    { value: '農業・林業関係', label: '農業・林業関係' },
    { value: '漁業関係', label: '漁業関係' },
    { value: '建設関係', label: '建設関係' },
    { value: '食品製造関係', label: '食品製造関係' },
    { value: '繊維・衣服関係', label: '繊維・衣服関係' },
    { value: '機械・金属関係', label: '機械・金属関係' },
    { value: 'その他', label: 'その他' },
]

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
    const [uploadingWorkEnvImage, setUploadingWorkEnvImage] = useState(false)
    const [workEnvImageModalVisible, setWorkEnvImageModalVisible] = useState(false)

    // 编辑工单状态
    const [editTicketDrawerVisible, setEditTicketDrawerVisible] = useState(false)
    const [editTicketForm] = Form.useForm()

    // 判断当前用户是否为工单负责人
    const isTicketOwner = ticket?.owner_id === user?.id
    const canEditTicket = isAdmin || isTicketOwner
    // 允许管理员或负责该工单的日方员工修改签证办理状态
    const canEditVisaStatus = isAdmin || (isJapaneseEmployee && isTicketOwner)

    // 查看文件 Modal 状态
    const [viewModalVisible, setViewModalVisible] = useState(false)
    const [currentViewFiles, setCurrentViewFiles] = useState<DocumentFile[]>([])
    const [currentViewApplicantId, setCurrentViewApplicantId] = useState<string | null>(null)
    const [currentViewField, setCurrentViewField] = useState<string | null>(null)

    const [feedbackModalVisible, setFeedbackModalVisible] = useState(false)
    const [feedbackApplicant, setFeedbackApplicant] = useState<Customer | null>(null)
    const [feedbackFields, setFeedbackFields] = useState<string[]>([])
    const [feedbackContent, setFeedbackContent] = useState('')
    const [submittingFeedback, setSubmittingFeedback] = useState(false)
    const tFeedback = useTranslations('FeedbackCenter')

    // 问答功能状态
    const [questions, setQuestions] = useState<WorkOrderQuestion[]>([])
    const [newQuestionContent, setNewQuestionContent] = useState('')
    const [replyContents, setReplyContents] = useState<Record<string, string>>({})
    const [submittingQuestion, setSubmittingQuestion] = useState(false)
    const [submittingReply, setSubmittingReply] = useState<string | null>(null)
    const tQA = useTranslations('WorkOrderQA')

    // 邮件发送状态
    const [emailModalVisible, setEmailModalVisible] = useState(false)
    const [sendingEmail, setSendingEmail] = useState(false)
    const [emailTo, setEmailTo] = useState('')
    const [emailSubject, setEmailSubject] = useState('')
    const [emailContent, setEmailContent] = useState('')

    // 组合加入申请书发送状态
    const [sendAppModalVisible, setSendAppModalVisible] = useState(false)
    const [sendingApp, setSendingApp] = useState(false)
    const [appEmailContent, setAppEmailContent] = useState('')


    const t = useTranslations('WorkOrder')
    const tCommon = useTranslations('Common')
    const tApplicant = useTranslations('Applicant')
    const locale = useLocale()

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

    // 获取问答列表
    const fetchQuestions = async () => {
        try {
            // 获取问题列表
            const { data: questionsData, error: questionsError } = await supabase
                .from('work_order_questions')
                .select('*')
                .eq('work_order_id', ticketId)
                .order('created_at', { ascending: false })

            if (questionsError) throw questionsError

            // 获取所有问题的回复
            if (questionsData && questionsData.length > 0) {
                const questionIds = questionsData.map(q => q.id)
                const { data: answersData, error: answersError } = await supabase
                    .from('work_order_answers')
                    .select('*')
                    .in('question_id', questionIds)
                    .order('created_at', { ascending: true })

                if (answersError) throw answersError

                // 将回复关联到问题
                const questionsWithAnswers = questionsData.map(q => ({
                    ...q,
                    answers: answersData?.filter(a => a.question_id === q.id) || []
                }))
                setQuestions(questionsWithAnswers)
            } else {
                setQuestions([])
            }
        } catch (error) {
            console.error('获取问答列表失败:', error)
        }
    }

    // 提交问题（中方员工）
    const handleSubmitQuestion = async () => {
        if (!newQuestionContent.trim()) {
            message.warning(tQA('messages.contentRequired'))
            return
        }
        if (!user) return

        setSubmittingQuestion(true)
        try {
            const { error } = await supabase
                .from('work_order_questions')
                .insert([{
                    work_order_id: ticketId,
                    asker_id: user.id,
                    asker_name: user.username,
                    content: newQuestionContent.trim(),
                    is_answered: false
                }])

            if (error) throw error
            message.success(tQA('messages.submitSuccess'))
            setNewQuestionContent('')
            fetchQuestions()
        } catch (error) {
            console.error('提交问题失败:', error)
            message.error(tQA('messages.submitError'))
        } finally {
            setSubmittingQuestion(false)
        }
    }

    // 提交回复（日方员工/工单负责人）
    const handleSubmitReply = async (questionId: string) => {
        const content = replyContents[questionId]?.trim()
        if (!content) {
            message.warning(tQA('messages.contentRequired'))
            return
        }
        if (!user) return

        setSubmittingReply(questionId)
        try {
            // 插入回复
            const { error: replyError } = await supabase
                .from('work_order_answers')
                .insert([{
                    question_id: questionId,
                    responder_id: user.id,
                    responder_name: user.username,
                    content: content
                }])

            if (replyError) throw replyError

            // 标记问题为已回复
            const { error: updateError } = await supabase
                .from('work_order_questions')
                .update({ is_answered: true, updated_at: new Date().toISOString() })
                .eq('id', questionId)

            if (updateError) throw updateError

            message.success(tQA('messages.submitSuccess'))
            setReplyContents(prev => ({ ...prev, [questionId]: '' }))
            fetchQuestions()
        } catch (error) {
            console.error('提交回复失败:', error)
            message.error(tQA('messages.submitError'))
        } finally {
            setSubmittingReply(null)
        }
    }

    useEffect(() => {
        if (ticketId) {
            fetchTicketDetail()
            fetchApplicants()
            fetchQuestions()
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
            name: applicant.real_name || applicant.nickname,
            status: applicant.stage2_status,
            gender: applicant.gender,
            birth_date: applicant.birth_date ? dayjs(applicant.birth_date) : null,
            household_location: applicant.household_location,
            current_residence: applicant.current_residence,
            contact: applicant.contact || applicant.phone,
            wechat: applicant.wechat,
            emergency_contact: applicant.emergency_contact,
            emergency_phone: applicant.emergency_phone
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
    const handleViewFiles = (files: DocumentFile[], applicantId?: string, field?: string) => {
        console.log('Viewing files:', files)
        if (!files || files.length === 0) {
            message.warning(t('messages.noFileWarning'))
            return
        }
        setCurrentViewFiles(files)
        if (applicantId && field) {
            setCurrentViewApplicantId(applicantId)
            setCurrentViewField(field)
        } else {
            setCurrentViewApplicantId(null)
            setCurrentViewField(null)
        }
        setViewModalVisible(true)
    }

    // 删除文件
    const handleDeleteFile = async (fileToDelete: DocumentFile) => {
        if (!currentViewApplicantId || !currentViewField) return

        Modal.confirm({
            title: tCommon('confirmDelete'),
            content: t('messages.confirmDeleteFile'),
            okText: tCommon('confirm'),
            cancelText: tCommon('cancel'),
            okButtonProps: { danger: true },
            onOk: async () => {
                try {
                    const applicant = applicants.find(a => a.id === currentViewApplicantId)
                    if (!applicant) return

                    // 1. 调用API删除OSS文件
                    try {
                        const deleteResponse = await fetch(`/api/upload?filepath=${encodeURIComponent(fileToDelete.url)}`, {
                            method: 'DELETE'
                        })
                        if (!deleteResponse.ok) {
                            console.error('物理文件删除失败，但继续清理数据库记录')
                        }
                    } catch (e) {
                        console.error('调用删除API失败', e)
                    }

                    // 2. 更新数据库
                    const currentFiles = (applicant[currentViewField as keyof Customer] as any[]) || []

                    const updatedFiles = currentFiles.filter(f => {
                        let fUrl = ''
                        if (typeof f === 'string') {
                            // 尝试解析JSON字符串
                            try {
                                const parsed = JSON.parse(f)
                                if (parsed && typeof parsed === 'object' && parsed.url) {
                                    fUrl = parsed.url
                                } else {
                                    fUrl = f
                                }
                            } catch {
                                // 普通字符串URL
                                fUrl = f
                            }
                        } else if (f && typeof f === 'object') {
                            fUrl = f.url
                        }
                        return fUrl !== fileToDelete.url
                    })

                    const { error } = await supabase
                        .from('customers')
                        .update({ [currentViewField]: updatedFiles })
                        .eq('id', currentViewApplicantId)

                    if (error) throw error

                    message.success(tCommon('deleteSuccess'))
                    fetchApplicants() // 刷新列表

                    // 更新当前查看的文件列表
                    if (updatedFiles.length === 0) {
                        setViewModalVisible(false)
                    } else {
                        setCurrentViewFiles(updatedFiles)
                    }
                } catch (error) {
                    console.error('删除文件失败:', error)
                    message.error(tCommon('deleteError'))
                }
            }
        })
    }

    // 打开反馈弹窗
    const handleOpenFeedback = (applicant: Customer) => {
        setFeedbackApplicant(applicant)
        setFeedbackFields([])
        setFeedbackContent('')
        setFeedbackModalVisible(true)
    }

    // 提交反馈
    const handleSubmitFeedback = async () => {
        if (!feedbackApplicant || !user) return
        if (feedbackFields.length === 0) {
            message.warning(tFeedback('messages.selectFieldsRequired'))
            return
        }
        if (!feedbackContent.trim()) {
            message.warning(tFeedback('messages.contentRequired'))
            return
        }

        setSubmittingFeedback(true)
        try {
            // 获取应聘者的创建者ID作为处理者
            const handlerId = feedbackApplicant.owner ? ownerUserMap[feedbackApplicant.owner] : null
            if (!handlerId) {
                message.error(tFeedback('messages.noHandler'))
                setSubmittingFeedback(false)
                return
            }

            const { error } = await supabase
                .from('feedbacks')
                .insert([{
                    applicant_id: feedbackApplicant.id,
                    work_order_id: ticketId,
                    submitter_id: user.id,
                    handler_id: handlerId,
                    fields: feedbackFields,
                    content: feedbackContent,
                    status: 'pending'
                }])

            if (error) throw error
            message.success(tFeedback('messages.submitSuccess'))
            setFeedbackModalVisible(false)
        } catch (error) {
            console.error('提交反馈失败:', error)
            message.error(tFeedback('messages.submitError'))
        } finally {
            setSubmittingFeedback(false)
        }
    }

    // 反馈字段选项
    const feedbackFieldOptions = [
        { label: tApplicant('form.name'), value: 'real_name' },
        { label: tApplicant('form.gender'), value: 'gender' },
        { label: tApplicant('form.birthDate'), value: 'birth_date' },
        { label: tApplicant('form.householdLocation'), value: 'household_location' },
        { label: tApplicant('form.currentResidence'), value: 'current_residence' },
        { label: tApplicant('form.contact'), value: 'contact' },
        { label: tApplicant('form.wechat'), value: 'wechat' },
        { label: tApplicant('form.emergencyContact'), value: 'emergency_contact' },
        { label: tApplicant('form.emergencyPhone'), value: 'emergency_phone' },
        { label: tApplicant('documents.resume'), value: 'resume' },
        { label: tApplicant('documents.passport'), value: 'passport' },
        { label: tApplicant('documents.householdBook'), value: 'household_book' },
        { label: tApplicant('documents.idCard'), value: 'id_card' },
        { label: tApplicant('documents.photo2inch'), value: 'photo_2inch' },
        { label: tApplicant('documents.creditReport'), value: 'credit_report' },
        { label: tApplicant('documents.noCrimeCert'), value: 'no_crime_cert' },
        { label: tApplicant('documents.nationalCert'), value: 'national_cert' },
        { label: tApplicant('documents.provincialCert'), value: 'provincial_cert' },
        { label: tApplicant('documents.employmentContract'), value: 'employment_contract' },
        { label: tApplicant('documents.japanAgencyContract'), value: 'japan_agency_contract' },
        { label: tApplicant('documents.immigrationMaterials'), value: 'immigration_materials' },
    ]

    // 上传文件
    const handleUploadFile = async (file: File, field: string, applicantId: string) => {
        const maxSize = 4.5 * 1024 * 1024 // 4.5MB
        if (file.size > maxSize) {
            message.error(t('upload.fileSizeLimit'))
            return
        }

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

            const currentFiles = (currentApplicant[field as keyof Customer] as DocumentFile[]) || []

            const newFile: DocumentFile = {
                url: url,
                uploadedAt: new Date().toISOString()
            }

            const newFiles = [...currentFiles, newFile]

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

    // 切换签证状态
    // 切换签证状态
    const handleToggleVisaStatus = async (applicant: Customer, newStatus: 'pending' | 'otit_preparing' | 'otit_submitted' | 'visa_preparing' | 'visa_submitted' | 'completed') => {
        if (applicant.stage2_status !== '培训中') {
            message.warning(t('messages.visaStatusDisabled'))
            return
        }

        try {
            const { error } = await supabase
                .from('customers')
                .update({ visa_status: newStatus })
                .eq('id', applicant.id)

            if (error) throw error
            message.success(t('messages.visaStatusUpdated'))
            fetchApplicants() // 刷新列表
        } catch (error) {
            console.error('更新签证状态失败:', error)
            message.error(tCommon('error'))
        }
    }

    // 获取签证状态显示和切换组件
    const getVisaStatusTag = (applicant: Customer) => {
        const isTraining = applicant.stage2_status === '培训中'
        const status = applicant.visa_status || 'pending'

        const statusConfig: Record<string, { color: string, text: string }> = {
            'pending': { color: 'orange', text: t('visa.pending') },
            'otit_preparing': { color: 'geekblue', text: t('visa.otit_preparing') },
            'otit_submitted': { color: 'blue', text: t('visa.otit_submitted') },
            'visa_preparing': { color: 'cyan', text: t('visa.visa_preparing') },
            'visa_submitted': { color: 'purple', text: t('visa.visa_submitted') },
            'completed': { color: 'green', text: t('visa.completed') }
        }

        const config = statusConfig[status] || statusConfig['pending']

        return (
            <Space>
                {isTraining && isJapaneseEmployee ? (
                    <Dropdown
                        menu={{
                            items: [
                                { key: 'pending', label: t('visa.pending'), onClick: () => handleToggleVisaStatus(applicant, 'pending') },
                                { key: 'otit_preparing', label: t('visa.otit_preparing'), onClick: () => handleToggleVisaStatus(applicant, 'otit_preparing') },
                                { key: 'otit_submitted', label: t('visa.otit_submitted'), onClick: () => handleToggleVisaStatus(applicant, 'otit_submitted') },
                                { key: 'visa_preparing', label: t('visa.visa_preparing'), onClick: () => handleToggleVisaStatus(applicant, 'visa_preparing') },
                                { key: 'visa_submitted', label: t('visa.visa_submitted'), onClick: () => handleToggleVisaStatus(applicant, 'visa_submitted') },
                                { key: 'completed', label: t('visa.completed'), onClick: () => handleToggleVisaStatus(applicant, 'completed') }
                            ]
                        }}
                    >
                        <Tag color={config.color} style={{ cursor: 'pointer', opacity: 1 }}>
                            {config.text} <EditOutlined />
                        </Tag>
                    </Dropdown>
                ) : (
                    <Tag color={isTraining ? config.color : 'default'} style={{ opacity: isTraining ? 1 : 0.5 }}>
                        {config.text}
                    </Tag>
                )}
            </Space>
        )
    }

    // 打开邮件发送弹窗
    const handleOpenEmailModal = (applicant: Customer) => {
        // 优先使用 email 字段，其次尝试从 contact 中提取
        let emailTo = applicant.email || ''
        if (!emailTo) {
            const contact = applicant.contact || ''
            const emailMatch = contact.match(/[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}/)
            emailTo = emailMatch ? emailMatch[0] : ''
        }

        setEmailTo(emailTo)
        setEmailSubject(`关于工单：${ticket?.position || ''}`)
        setEmailContent('')
        setEmailModalVisible(true)
    }

    // 打开发送组合加入申请书 Modal
    const handleOpenSendAppModal = () => {
        if (!company?.email) {
            message.error(tCommon('email.noCompanyEmail'))
            return
        }

        // Check if file exists OR if it can be generated
        const hasFile = company.association_application_form && company.association_application_form.length > 0
        const canGenerate = !!company.first_training_at

        if (!hasFile && !canGenerate) {
            message.error(tCommon('email.noAppForm'))
            return
        }
        setAppEmailContent(t('email.appFormPresetContent'))
        setSendAppModalVisible(true)
    }

    // 发送组合加入申请书
    const handleSendAppForm = async () => {
        if (!company?.email) return
        if (!company?.first_training_at) {
            message.error('企业未设置首次培训时间，无法生成文件')
            return
        }

        try {
            setSendingApp(true)
            message.loading('正在检查文件...')

            // Helper to upload file to OSS
            const uploadFileToOSS = async (pdfBytes: Uint8Array, fileName: string) => {
                const blob = new Blob([pdfBytes as any], { type: 'application/pdf' })
                const file = new File([blob], fileName, { type: 'application/pdf' })
                const formData = new FormData()
                formData.append('file', file)

                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                })

                if (!response.ok) throw new Error('文件上传失败: ' + fileName)
                const { url } = await response.json()
                return url
            }

            // 1. 组合加入申请书 (Union Join Application)
            let unionJoinUrl = ''

            if (company.association_application_form && company.association_application_form.length > 0) {
                unionJoinUrl = company.association_application_form[0].url
            } else {
                message.loading('正在生成组合加入申请书...')
                const pdfBytes = await generateUnionJoinApplication(company as any)
                const ossPath = await uploadFileToOSS(pdfBytes, `${company.name}_Combined_Application_Form.pdf`)
                unionJoinUrl = ossPath

                // Update DB
                await supabase.from('companies').update({
                    association_application_form: [{
                        url: ossPath,
                        uploadedAt: new Date().toISOString()
                    }]
                }).eq('id', company.id)
            }

            // 2. 技能实训规约 (Technical Intern Training Program Agreement)
            let termsUrl = ''

            if (company.technical_intern_training_program_agreement && company.technical_intern_training_program_agreement.length > 0) {
                termsUrl = company.technical_intern_training_program_agreement[0].url
            } else {
                message.loading('正在生成技能实习规约...')
                const pdfBytes = await generateTechnicalInternTrainingProgramAgreement(company as any)
                const ossPath = await uploadFileToOSS(pdfBytes, `${company.name}_Technical_Intern_Agreement.pdf`)
                termsUrl = ossPath

                // Update DB
                await supabase.from('companies').update({
                    technical_intern_training_program_agreement: [{
                        url: ossPath,
                        uploadedAt: new Date().toISOString()
                    }]
                }).eq('id', company.id)
            }

            // Construct HTML with TWO buttons (links only, no file attachments)
            const buttonsHtml = `
                <div style="margin: 20px 0;">
                    <a href="${getFileUrl(unionJoinUrl)}" target="_blank" style="display: inline-block; padding: 12px 24px; background-color: #1890ff; color: white; text-decoration: none; border-radius: 4px; margin-right: 15px; font-weight: bold;">
                        📄 組合加入申込書
                    </a>
                    <a href="${getFileUrl(termsUrl)}" target="_blank" style="display: inline-block; padding: 12px 24px; background-color: #1890ff; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">
                        📄 技能実習規約
                    </a>
                </div>
            `

            // Insert buttons into content
            let htmlContent = ''
            const footerSeparator = '**************************************'
            if (appEmailContent.includes(footerSeparator)) {
                const [body, footer] = appEmailContent.split(footerSeparator)
                htmlContent = `
                    <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                        ${body.replace(/\n/g, '<br>')}
                        ${buttonsHtml}
                        <div style="margin-top: 20px; border-top: 1px dashed #ccc; padding-top: 20px;">
                            ${footerSeparator}<br>
                            ${footer.replace(/\n/g, '<br>')}
                        </div>
                    </div>
                `
            } else {
                htmlContent = `
                    <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                        ${appEmailContent.replace(/\n/g, '<br>')}
                        ${buttonsHtml}
                    </div>
                `
            }

            console.log('Sending email with HTML buttons (no attachments)...')
            const emailPayload = JSON.stringify({
                to: company.email,
                subject: t('email.sendAssociationApp'),
                content: appEmailContent,
                html: htmlContent
            })
            console.log('Email payload size:', emailPayload.length, 'bytes')
            console.log('Email payload preview:', emailPayload.substring(0, 500))
            const response = await fetch('/api/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: emailPayload,
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send email')
            }

            message.success(t('email.appFormSentSuccess'))
            setSendAppModalVisible(false)

            // Refresh logic - using simple reload for data consistency
            if (company.id) {
                window.location.reload()
            }

        } catch (error: any) {
            console.error('Error sending email:', error)
            message.error(error.message || tCommon('email.error'))
        } finally {
            setSendingApp(false)
        }
    }

    // 发送邮件
    const handleSendEmail = async () => {
        if (!emailTo) {
            message.warning(t('email.to') + ' ' + tCommon('required')) // Assuming required exists or just warn
            return
        }
        if (!emailSubject) {
            message.warning(t('email.subject') + ' ' + tCommon('required'))
            return
        }
        if (!emailContent) {
            message.warning(t('email.content') + ' ' + tCommon('required'))
            return
        }

        setSendingEmail(true)
        try {
            const response = await fetch('/api/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    to: emailTo,
                    subject: emailSubject,
                    content: emailContent
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send email')
            }

            message.success(t('email.success'))
            setEmailModalVisible(false)
        } catch (error: any) {
            console.error('发送邮件失败:', error)
            message.error(t('email.error') + ': ' + error.message)
        } finally {
            setSendingEmail(false)
        }
    }

    // 上传工作环境图片
    const handleUploadWorkEnvImage = async (file: File) => {
        const maxSize = 4.5 * 1024 * 1024 // 4.5MB
        if (file.size > maxSize) {
            message.error(t('upload.fileSizeLimit'))
            return false
        }

        setUploadingWorkEnvImage(true)
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
            const currentImages = ticket?.work_environment_images || []
            const newImage: DocumentFile = {
                url: url,
                uploadedAt: new Date().toISOString()
            }

            const { error } = await supabase
                .from('work_orders')
                .update({ work_environment_images: [...currentImages, newImage] })
                .eq('id', ticketId)

            if (error) throw error

            message.success(t('messages.uploadSuccess'))
            fetchTicketDetail()
        } catch (error) {
            console.error('上传失败:', error)
            message.error(t('messages.uploadError'))
        } finally {
            setUploadingWorkEnvImage(false)
        }
        return false
    }

    // 删除工作环境图片
    const handleDeleteWorkEnvImage = async (imageUrl: string) => {
        Modal.confirm({
            title: t('messages.confirmDeleteTitle'),
            content: t('messages.confirmDeleteContent'),
            okText: tCommon('confirm'),
            cancelText: tCommon('cancel'),
            okButtonProps: { danger: true },
            async onOk() {
                try {
                    const currentImages = ticket?.work_environment_images || []
                    const updatedImages = currentImages.filter(img => img.url !== imageUrl)

                    const { error } = await supabase
                        .from('work_orders')
                        .update({ work_environment_images: updatedImages.length > 0 ? updatedImages : null })
                        .eq('id', ticketId)

                    if (error) throw error

                    message.success(t('messages.deleteSuccess'))
                    fetchTicketDetail()
                } catch (error) {
                    console.error('删除图片失败:', error)
                    message.error(t('messages.deleteError'))
                }
            }
        })
    }

    // 打开编辑工单Drawer
    const handleEditTicket = () => {
        editTicketForm.setFieldsValue({
            // Industry is inherited
            position: ticket?.position,
            recruit_count: ticket?.recruit_count,
            salary: ticket?.salary,
            work_time: ticket?.work_time,
            rest_days: ticket?.rest_days,
            benefits: ticket?.benefits,
            accommodation_type: ticket?.accommodation_type,
            accommodation_address: ticket?.accommodation_address
        })
        setEditTicketDrawerVisible(true)
    }

    // 提交编辑工单
    const handleEditTicketSubmit = async (values: any) => {
        try {
            const { error } = await supabase
                .from('work_orders')
                .update({
                    // Industry is not updated here, it lives on Company
                    position: values.position,
                    recruit_count: values.recruit_count,
                    salary: values.salary,
                    work_time: values.work_time,
                    rest_days: values.rest_days,
                    benefits: values.benefits,
                    accommodation_type: values.accommodation_type,
                    accommodation_address: values.accommodation_address
                })
                .eq('id', ticketId)

            if (error) throw error
            message.success(t('messages.updateSuccess'))
            setEditTicketDrawerVisible(false)
            fetchTicketDetail()
        } catch (error) {
            console.error('更新工单失败:', error)
            message.error(t('messages.updateError'))
        }
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
            <Card
                title={t('detail.title')}
                style={{ marginBottom: 16 }}
                extra={
                    <Space>
                    </Space>
                }
            >
                <Descriptions bordered column={2}>

                    <Descriptions.Item label={t('columns.name')}>{company?.industry || '-'}</Descriptions.Item>
                    <Descriptions.Item label={t('columns.companyName')}>
                        {company ? (
                            <Link href={`/companies/${company.id}`} style={{ color: '#1890ff', fontWeight: 500 }}>
                                {company.name}
                            </Link>
                        ) : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label={t('form.position')}>{ticket?.position}</Descriptions.Item>
                    <Descriptions.Item label={t('form.recruitCount')}>{ticket?.recruit_count}人</Descriptions.Item>
                    <Descriptions.Item label={t('form.salary')}>{ticket?.salary}</Descriptions.Item>
                    <Descriptions.Item label={t('form.workTime')}>{ticket?.work_time}</Descriptions.Item>
                    <Descriptions.Item label={t('form.restDays')}>{ticket?.rest_days}</Descriptions.Item>
                    <Descriptions.Item label={t('form.accommodationType')}>
                        {ticket?.accommodation_type === 'free' ? t('form.accommodationFree') :
                            ticket?.accommodation_type === 'paid' ? t('form.accommodationPaid') : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label={t('form.accommodationAddress')}>{ticket?.accommodation_address || '-'}</Descriptions.Item>
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

                {/* 工作环境图片区域 */}
                <div style={{ marginTop: 24 }}>
                    <h4 style={{ marginBottom: 16 }}>
                        <PictureOutlined style={{ marginRight: 8 }} />
                        {t('form.workEnvironmentImages')}
                    </h4>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        {/* 上传按钮在左边 - 管理员或工单负责人可上传 */}
                        {canEditTicket && (
                            <Upload
                                showUploadList={false}
                                accept="image/*"
                                beforeUpload={(file) => handleUploadWorkEnvImage(file)}
                                disabled={uploadingWorkEnvImage}
                            >
                                <div style={{
                                    width: 120,
                                    height: 120,
                                    border: '1px dashed #d9d9d9',
                                    borderRadius: 8,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    flexDirection: 'column',
                                    backgroundColor: '#fafafa'
                                }}>
                                    {uploadingWorkEnvImage ? (
                                        <span>{t('actions.uploading')}</span>
                                    ) : (
                                        <>
                                            <PlusOutlined style={{ fontSize: 24 }} />
                                            <div style={{ marginTop: 8 }}>{t('actions.upload')}</div>
                                        </>
                                    )}
                                </div>
                            </Upload>
                        )}
                        {/* 图片展示在右边 */}
                        {(ticket?.work_environment_images || []).map((img, index) => (
                            <div key={index} style={{ position: 'relative', width: 120, height: 120, border: '1px solid #d9d9d9', borderRadius: 8, overflow: 'hidden' }}>
                                <img
                                    src={getFileUrl(img.url)}
                                    alt={`工作环境 ${index + 1}`}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                                    onClick={() => window.open(getFileUrl(img.url), '_blank')}
                                />
                                {isAdmin && (
                                    <Button
                                        type="primary"
                                        danger
                                        size="small"
                                        icon={<DeleteOutlined />}
                                        style={{ position: 'absolute', top: 4, right: 4 }}
                                        onClick={() => handleDeleteWorkEnvImage(img.url)}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                    {(!ticket?.work_environment_images || ticket.work_environment_images.length === 0) && !isAdmin && (
                        <div style={{ textAlign: 'center', padding: '20px 0', color: '#999' }}>
                            {t('messages.noFileWarning')}
                        </div>
                    )}
                </div>
            </Card>

            {/* 问答区域 - 中方员工和工单负责人可见 */}
            {
                (isChineseEmployee || isTicketOwner || isAdmin) && (
                    <Card style={{ marginTop: 16 }}>
                        <Collapse defaultActiveKey={questions.some(q => !q.is_answered) ? ['qa'] : []}>
                            <Collapse.Panel
                                header={
                                    <Space>
                                        <span>{tQA('collapseTitle')}</span>
                                        {questions.filter(q => !q.is_answered).length > 0 && (
                                            <Tag color="red">
                                                {questions.filter(q => !q.is_answered).length} {tQA('pendingAnswer')}
                                            </Tag>
                                        )}
                                    </Space>
                                }
                                key="qa"
                            >
                                {/* 中方员工提问表单 */}
                                {isChineseEmployee && (
                                    <div style={{ marginBottom: 24, padding: 16, background: '#fafafa', borderRadius: 8 }}>
                                        <h4 style={{ marginBottom: 12 }}>{tQA('askQuestion')}</h4>
                                        <Input.TextArea
                                            value={newQuestionContent}
                                            onChange={(e) => setNewQuestionContent(e.target.value)}
                                            placeholder={tQA('questionPlaceholder')}
                                            rows={3}
                                            style={{ marginBottom: 12 }}
                                        />
                                        <Button
                                            type="primary"
                                            onClick={handleSubmitQuestion}
                                            loading={submittingQuestion}
                                        >
                                            {tQA('submitQuestion')}
                                        </Button>
                                    </div>
                                )}

                                {/* 问题列表 */}
                                {questions.length > 0 ? (
                                    <div>
                                        {questions.map((question) => (
                                            <div
                                                key={question.id}
                                                style={{
                                                    marginBottom: 16,
                                                    padding: 16,
                                                    border: '1px solid #e8e8e8',
                                                    borderRadius: 8,
                                                    background: question.is_answered ? '#fff' : 'rgba(255, 0, 0, 0.05)'
                                                }}
                                            >
                                                {/* 问题内容 */}
                                                <div style={{ marginBottom: 12 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                                        <Space>
                                                            <Tag color="blue">{tQA('questionBy')}: {question.asker_name}</Tag>
                                                            <span style={{ color: '#999', fontSize: 12 }}>
                                                                {new Date(question.created_at).toLocaleString('zh-CN')}
                                                            </span>
                                                        </Space>
                                                        <Tag color={question.is_answered ? 'green' : 'orange'}>
                                                            {question.is_answered ? tQA('answered') : tQA('pendingAnswer')}
                                                        </Tag>
                                                    </div>
                                                    <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{question.content}</p>
                                                </div>

                                                {/* 回复列表 */}
                                                {question.answers && question.answers.length > 0 && (
                                                    <div style={{ marginLeft: 24, borderLeft: '2px solid #1890ff', paddingLeft: 16 }}>
                                                        {question.answers.map((answer) => (
                                                            <div key={answer.id} style={{ marginBottom: 8, padding: 8, background: '#f0f7ff', borderRadius: 4 }}>
                                                                <div style={{ marginBottom: 4 }}>
                                                                    <Space>
                                                                        <Tag color="green">{tQA('replyBy')}: {answer.responder_name}</Tag>
                                                                        <span style={{ color: '#999', fontSize: 12 }}>
                                                                            {new Date(answer.created_at).toLocaleString('zh-CN')}
                                                                        </span>
                                                                    </Space>
                                                                </div>
                                                                <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{answer.content}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* 日方员工/工单负责人回复表单 */}
                                                {(isTicketOwner || isAdmin) && !question.is_answered && (
                                                    <div style={{ marginTop: 12, marginLeft: 24 }}>
                                                        <Input.TextArea
                                                            value={replyContents[question.id] || ''}
                                                            onChange={(e) => setReplyContents(prev => ({ ...prev, [question.id]: e.target.value }))}
                                                            placeholder={tQA('replyPlaceholder')}
                                                            rows={2}
                                                            style={{ marginBottom: 8 }}
                                                        />
                                                        <Button
                                                            type="primary"
                                                            size="small"
                                                            onClick={() => handleSubmitReply(question.id)}
                                                            loading={submittingReply === question.id}
                                                        >
                                                            {tQA('submitReply')}
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '20px 0', color: '#999' }}>
                                        {tQA('noQuestions')}
                                    </div>
                                )}
                            </Collapse.Panel>
                        </Collapse>
                    </Card>
                )
            }

            {/* 应聘者列表 - 仅日方员工可见 */}
            {
                !isChineseEmployee && (
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
                                    label: (
                                        <Space>
                                            {applicant.real_name || applicant.nickname || `应聘者${index + 1}`}
                                            {applicant.stage2_status === '培训中' && getVisaStatusTag(applicant)}
                                        </Space>
                                    ),
                                    children: (
                                        <div style={{ padding: '16px 0' }}>
                                            {canEditVisaStatus && (
                                                <Space style={{ marginBottom: 16, float: 'right' }}>
                                                    {/* 签证状态切换 - 仅在培训中显示 */}
                                                    {applicant.stage2_status === '培训中' && (
                                                        <Dropdown
                                                            menu={{
                                                                items: [
                                                                    { key: 'pending', label: t('visa.pending'), onClick: () => handleToggleVisaStatus(applicant, 'pending') },
                                                                    { key: 'otit_preparing', label: t('visa.otit_preparing'), onClick: () => handleToggleVisaStatus(applicant, 'otit_preparing') },
                                                                    { key: 'otit_submitted', label: t('visa.otit_submitted'), onClick: () => handleToggleVisaStatus(applicant, 'otit_submitted') },
                                                                    { key: 'visa_preparing', label: t('visa.visa_preparing'), onClick: () => handleToggleVisaStatus(applicant, 'visa_preparing') },
                                                                    { key: 'visa_submitted', label: t('visa.visa_submitted'), onClick: () => handleToggleVisaStatus(applicant, 'visa_submitted') },
                                                                    { key: 'completed', label: t('visa.completed'), onClick: () => handleToggleVisaStatus(applicant, 'completed') }
                                                                ]
                                                            }}
                                                        >
                                                            <Button>
                                                                {t('visa.status')} <EditOutlined />
                                                            </Button>
                                                        </Dropdown>
                                                    )}
                                                    <Button
                                                        icon={<MailOutlined />}
                                                        onClick={() => handleOpenEmailModal(applicant)}
                                                    >
                                                        {t('email.send')}
                                                    </Button>
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

                                            {isJapaneseEmployee && (
                                                <div style={{ float: 'right', marginBottom: 16 }}>
                                                    <Button
                                                        type="primary"
                                                        danger
                                                        icon={<AlertOutlined />}
                                                        onClick={() => handleOpenFeedback(applicant)}
                                                    >
                                                        {tFeedback('actions.feedback')}
                                                    </Button>
                                                </div>
                                            )}
                                            <div style={{ clear: 'both' }}></div>

                                            <Row gutter={[16, 16]}>
                                                <Col xs={24} sm={12} md={8}>
                                                    <div><strong>{tApplicant('form.name')}：</strong>{applicant.real_name || applicant.nickname}</div>
                                                </Col>
                                                <Col xs={24} sm={12} md={8}>
                                                    <div><strong>{t('visa.status')}：</strong>{getVisaStatusTag(applicant)}</div>
                                                </Col>
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
                                                    <div><strong>{tApplicant('form.email')}：</strong>{applicant.email || '-'}</div>
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
                                            </Row>

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
                                                        const fieldValue = applicant[field as keyof Customer] as DocumentFile[] | undefined
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
                                                                                if (hasFile && fieldValue) {
                                                                                    handleViewFiles(fieldValue, applicant.id, field)
                                                                                }
                                                                            }}
                                                                            disabled={!hasFile}
                                                                        >
                                                                            {t('actions.view')}{hasFile ? `(${fieldValue!.length})` : ''}
                                                                        </Button>
                                                                        {(isAdmin || (isJapaneseEmployee && field === 'employment_contract')) && (
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
                                        </div>
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
            < Drawer
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
                        name="email"
                        label={tApplicant('form.email')}
                        rules={[{ type: 'email', message: 'Please enter a valid email' }]}
                    >
                        <Input placeholder={tApplicant('form.emailPlaceholder')} />
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
                    {currentViewFiles.map((file, index) => {
                        console.log('Rendering file:', file)
                        let fileUrl = ''
                        let uploadTime = null

                        if (typeof file === 'string') {
                            try {
                                const parsed = JSON.parse(file)
                                if (parsed && typeof parsed === 'object') {
                                    fileUrl = parsed.url
                                    uploadTime = parsed.uploadedAt
                                } else {
                                    fileUrl = file
                                }
                            } catch (e) {
                                fileUrl = file
                            }
                        } else if (file && typeof file === 'object') {
                            fileUrl = file.url
                            uploadTime = file.uploadedAt
                        }

                        if (!fileUrl) return null


                        return (
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
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ wordBreak: 'break-all' }}>
                                            {fileUrl.split('/').pop()}
                                        </span>
                                        <span style={{ fontSize: '12px', color: '#999' }}>
                                            {t('uploadTime')}: {uploadTime ? new Date(uploadTime).toLocaleString(locale) : '-'}
                                        </span>
                                    </div>
                                </div>
                                <Button
                                    type="link"
                                    onClick={() => window.open(getFileUrl(fileUrl), '_blank')}
                                >
                                    {tCommon('view')}
                                </Button>
                                {(isAdmin || (isJapaneseEmployee && currentViewField === 'employment_contract')) && (
                                    <Button
                                        type="link"
                                        danger
                                        onClick={() => handleDeleteFile({ url: fileUrl, uploadedAt: uploadTime || '' })}
                                    >
                                        {tCommon('delete')}
                                    </Button>
                                )}
                            </div >
                        )
                    })}
                </div >
            </Modal >

            {/* 反馈弹窗 */}
            <Modal
                title={tFeedback('submitModal.title')}
                open={feedbackModalVisible}
                onOk={handleSubmitFeedback}
                onCancel={() => {
                    setFeedbackModalVisible(false)
                    setFeedbackApplicant(null)
                    setFeedbackFields([])
                    setFeedbackContent('')
                }}
                okText={tFeedback('submitModal.submit')}
                cancelText={tCommon('cancel')}
                confirmLoading={submittingFeedback}
                width={600}
            >
                <div style={{ marginBottom: 16 }}>
                    <p><strong>{tFeedback('submitModal.applicant')}:</strong> {feedbackApplicant?.real_name || feedbackApplicant?.nickname}</p>
                </div>
                <div style={{ marginBottom: 16 }}>
                    <p><strong>{tFeedback('submitModal.selectFields')}:</strong></p>
                    <Checkbox.Group
                        options={feedbackFieldOptions}
                        value={feedbackFields}
                        onChange={(values) => setFeedbackFields(values as string[])}
                        style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}
                    />
                </div>
                <div>
                    <p><strong>{tFeedback('submitModal.content')}:</strong></p>
                    <TextArea
                        rows={4}
                        placeholder={tFeedback('submitModal.contentPlaceholder')}
                        value={feedbackContent}
                        onChange={(e) => setFeedbackContent(e.target.value)}
                    />
                </div>
            </Modal>

            {/* 编辑工单 Drawer */}
            <Drawer
                title={t('edit.title')}
                width={720}
                onClose={() => setEditTicketDrawerVisible(false)}
                open={editTicketDrawerVisible}
            >
                <Form
                    form={editTicketForm}
                    layout="vertical"
                    onFinish={handleEditTicketSubmit}
                >
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="position"
                                label={t('form.position')}
                                rules={[{ required: true, message: t('form.positionPlaceholder') }]}
                            >
                                <Input placeholder={t('form.positionPlaceholder')} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="recruit_count"
                                label={t('form.recruitCount')}
                                rules={[{ required: true, message: t('form.recruitCountPlaceholder') }]}
                            >
                                <Input type="number" placeholder={t('form.recruitCountPlaceholder')} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="salary"
                                label={t('form.salary')}
                            >
                                <Input placeholder={t('form.salaryPlaceholder')} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="work_time"
                                label={t('form.workTime')}
                            >
                                <Input placeholder={t('form.workTimePlaceholder')} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="rest_days"
                                label={t('form.restDays')}
                            >
                                <Input placeholder={t('form.restDaysPlaceholder')} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="accommodation_type"
                                label={t('form.accommodationType')}
                            >
                                <Select placeholder={t('form.accommodationTypePlaceholder')} allowClear>
                                    <Option value="free">{t('form.accommodationFree')}</Option>
                                    <Option value="paid">{t('form.accommodationPaid')}</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="accommodation_address"
                                label={t('form.accommodationAddress')}
                            >
                                <Input placeholder={t('form.accommodationAddressPlaceholder')} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item
                        name="benefits"
                        label={t('form.benefits')}
                    >
                        <TextArea rows={4} placeholder={t('form.benefitsPlaceholder')} />
                    </Form.Item>
                    <Form.Item>
                        <Space>
                            <Button onClick={() => setEditTicketDrawerVisible(false)}>{tCommon('cancel')}</Button>
                            <Button type="primary" htmlType="submit">{tCommon('save')}</Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Drawer>

            {/* 发送组合加入申请书 Modal */}
            <Modal
                title={t('email.sendAssociationApp')}
                open={sendAppModalVisible}
                onOk={handleSendAppForm}
                onCancel={() => setSendAppModalVisible(false)}
                confirmLoading={sendingApp}
                okText={t('email.send')}
                cancelText={tCommon('cancel')}
            >
                <div style={{ marginBottom: 16 }}>
                    <p>{t('email.sendAppConfirmContent', { email: company?.email || '' })}</p>
                </div>
                <Form layout="vertical">
                    <Form.Item label={t('email.content')} required>
                        <TextArea
                            value={appEmailContent}
                            onChange={e => setAppEmailContent(e.target.value)}
                            rows={6}
                        />
                    </Form.Item>
                </Form>
            </Modal>

            {/* 发送邮件 Modal */}
            <Modal
                title={t('email.title')}
                open={emailModalVisible}
                onOk={handleSendEmail}
                onCancel={() => setEmailModalVisible(false)}
                confirmLoading={sendingEmail}
                okText={t('email.send')}
                cancelText={tCommon('cancel')}
            >
                <Form layout="vertical">
                    <Form.Item label={t('email.to')} required>
                        <Input
                            value={emailTo}
                            onChange={e => setEmailTo(e.target.value)}
                            placeholder="example@email.com"
                        />
                    </Form.Item>
                    <Form.Item label={t('email.subject')} required>
                        <Input
                            value={emailSubject}
                            onChange={e => setEmailSubject(e.target.value)}
                            placeholder={t('email.subjectPlaceholder')}
                        />
                    </Form.Item>
                    <Form.Item label={t('email.content')} required>
                        <TextArea
                            value={emailContent}
                            onChange={e => setEmailContent(e.target.value)}
                            rows={6}
                            placeholder={t('email.contentPlaceholder')}
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </div >
    )
}
