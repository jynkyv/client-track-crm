'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useRouter } from '@/navigation'
import {
    Card,
    Button,
    Row,
    Col,
    Descriptions,
    message,
    Space,
    Timeline,
    Tag,
    Spin,
    Form,
    Input,
    Select,
    InputNumber
} from 'antd'
import {
    ArrowLeftOutlined,
    EditOutlined
} from '@ant-design/icons'
import { supabase, Customer, FollowUp } from '@/lib/supabase'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/contexts/AuthContext'

const { Option } = Select
const { TextArea } = Input

export default function PotentialCustomerDetailPage() {
    const params = useParams()
    const searchParams = useSearchParams()
    const router = useRouter()
    const customerId = params.id as string
    const [customer, setCustomer] = useState<Customer | null>(null)
    const [loading, setLoading] = useState(true)
    const [isEditing, setIsEditing] = useState(false)
    const [form] = Form.useForm()
    const t = useTranslations('potential')
    const tCommon = useTranslations('Common')
    const { canAccessCustomers } = useAuth()

    // 检查URL参数，如果包含edit=true，自动进入编辑模式
    useEffect(() => {
        const editParam = searchParams.get('edit')
        if (editParam === 'true') {
            setIsEditing(true)
            // 移除URL参数
            router.replace(`/customers/potential/${customerId}`)
        }
    }, [searchParams, customerId, router])

    // 获取客户详情
    useEffect(() => {
        const fetchCustomer = async () => {
            setLoading(true)
            try {
                const { data, error } = await supabase
                    .from('customers')
                    .select('*')
                    .eq('id', customerId)
                    .single()

                if (error) throw error
                setCustomer(data)
                // 设置表单初始值
                form.setFieldsValue(data)
            } catch (error) {
                console.error('获取客户详情失败:', error)
                message.error('获取客户详情失败')
            } finally {
                setLoading(false)
            }
        }

        if (customerId) {
            fetchCustomer()
        }
    }, [customerId, form])

    // 处理编辑
    const handleEdit = () => {
        setIsEditing(true)
    }

    // 取消编辑
    const handleCancelEdit = () => {
        setIsEditing(false)
        // 重置表单
        if (customer) {
            form.setFieldsValue(customer)
        }
    }

    // 提交编辑
    const handleSaveEdit = async (values: any) => {
        if (!customer) return

        try {
            const updateData = {
                nickname: values.nickname,
                contact: values.contact,
                intention: values.intention,
                status: values.status,
                source: values.source || '',
                age: values.age || null,
                gender: values.gender || null,
                work_experience: values.work_experience || null,
                notes: values.notes || null,
            }

            const { error } = await supabase
                .from('customers')
                .update(updateData)
                .eq('id', customer.id)

            if (error) throw error
            message.success(tCommon('success'))
            setIsEditing(false)
            // 刷新数据
            const { data, error: fetchError } = await supabase
                .from('customers')
                .select('*')
                .eq('id', customerId)
                .single()

            if (fetchError) throw fetchError
            setCustomer(data)
            form.setFieldsValue(data)
        } catch (error) {
            console.error('更新失败:', error)
            message.error(tCommon('error'))
        }
    }

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

    if (loading) {
        return (
            <Card>
                <div style={{ textAlign: 'center', padding: '50px' }}>
                    <Spin size="large" />
                </div>
            </Card>
        )
    }

    if (!customer) {
        return (
            <Card>
                <div style={{ textAlign: 'center', padding: '50px' }}>
                    <h2>客户不存在</h2>
                    <Button type="primary" onClick={() => router.push('/customers/potential')}>
                        返回列表
                    </Button>
                </div>
            </Card>
        )
    }

    const getStatusTag = (status: string) => {
        const colorMap: Record<string, string> = {
            'communicating': 'processing',
            'closed': 'success',
            'rejected': 'error'
        }
        return <Tag color={colorMap[status] || 'default'}>{t(`status.${status}`)}</Tag>
    }

    const getIntentionTag = (intention: string) => {
        const colorMap: Record<string, string> = {
            '高': 'red',
            '中': 'orange',
            '低': 'blue'
        }
        return <Tag color={colorMap[intention] || 'default'}>{intention}</Tag>
    }

    return (
        <div>
            <Card
                title={
                    <Space>
                        <Button
                            icon={<ArrowLeftOutlined />}
                            onClick={() => router.push('/customers/potential')}
                        >
                            {tCommon('back')}
                        </Button>
                        <span>{t('title')} - {customer.nickname}</span>
                    </Space>
                }
                extra={
                    !isEditing ? (
                        <Button
                            type="primary"
                            icon={<EditOutlined />}
                            onClick={handleEdit}
                        >
                            {tCommon('edit')}
                        </Button>
                    ) : (
                        <Space>
                            <Button onClick={handleCancelEdit}>
                                {tCommon('cancel')}
                            </Button>
                            <Button
                                type="primary"
                                onClick={() => form.submit()}
                            >
                                {tCommon('save')}
                            </Button>
                        </Space>
                    )
                }
            >
                {!isEditing ? (
                    <>
                        <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }} style={{ marginTop: 24 }}>
                            <Descriptions.Item label={t('columns.nickname')}>
                                {customer.nickname || '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label={t('columns.contact')}>
                                {customer.contact || '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label={t('columns.status')}>
                                {customer.status ? getStatusTag(customer.status) : '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label={t('columns.intention')}>
                                {customer.intention ? getIntentionTag(customer.intention) : '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label={t('columns.source')}>
                                {customer.source || '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label={t('columns.age')}>
                                {customer.age ? `${customer.age} ${tCommon('ageUnit')}` : '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label={t('columns.gender')}>
                                {customer.gender === 'male' ? t('gender.male') : customer.gender === 'female' ? t('gender.female') : '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label={t('columns.workExperience')}>
                                {customer.work_experience || '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label={t('columns.owner')}>
                                {customer.owner || '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label={t('columns.notes')} span={3}>
                                {customer.notes || '-'}
                            </Descriptions.Item>
                        </Descriptions>

                        {/* 跟进记录 */}
                        <h3 style={{ marginTop: 32, marginBottom: 16 }}>{t('columns.followUps')}</h3>
                        {customer.follow_ups && customer.follow_ups.length > 0 ? (
                            <Timeline
                                items={customer.follow_ups.map((followUp: FollowUp) => ({
                                    color: 'blue',
                                    children: (
                                        <div>
                                            <div style={{ fontWeight: 'bold' }}>{followUp.time}</div>
                                            <div>{followUp.content}</div>
                                        </div>
                                    )
                                }))}
                            />
                        ) : (
                            <div style={{ color: '#999' }}>{t('messages.noFollowUp')}</div>
                        )}
                    </>
                ) : (
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleSaveEdit}
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
                                    name="source"
                                    label={t('form.source')}
                                >
                                    <Input placeholder={t('form.source')} />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    name="age"
                                    label={t('form.age')}
                                >
                                    <InputNumber style={{ width: '100%' }} min={0} max={100} placeholder={t('form.age')} />
                                </Form.Item>
                            </Col>
                        </Row>
                        <Row gutter={16}>
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
                            <Col span={12}>
                                <Form.Item
                                    name="work_experience"
                                    label={t('form.workExperience')}
                                >
                                    <TextArea rows={2} placeholder={t('form.workExperience')} />
                                </Form.Item>
                            </Col>
                        </Row>
                        <Row gutter={16}>
                            <Col span={24}>
                                <Form.Item
                                    name="notes"
                                    label={t('form.notes')}
                                >
                                    <TextArea rows={4} placeholder={t('form.notes')} />
                                </Form.Item>
                            </Col>
                        </Row>
                    </Form>
                )}
            </Card>
        </div>
    )
}
