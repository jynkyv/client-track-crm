'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
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
    Spin
} from 'antd'
import {
    ArrowLeftOutlined
} from '@ant-design/icons'
import { supabase, Customer, FollowUp } from '@/lib/supabase'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/contexts/AuthContext'

export default function PotentialCustomerDetailPage() {
    const params = useParams()
    const router = useRouter()
    const customerId = params.id as string
    const [customer, setCustomer] = useState<Customer | null>(null)
    const [loading, setLoading] = useState(true)
    const t = useTranslations('potential')
    const tCommon = useTranslations('Common')
    const { canAccessCustomers } = useAuth()

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
    }, [customerId])

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
            <Card>
                <Space style={{ marginBottom: 16 }}>
                    <Button
                        icon={<ArrowLeftOutlined />}
                        onClick={() => router.push('/customers/potential')}
                    >
                        {tCommon('back')}
                    </Button>
                </Space>

                <h2>{t('title')} - {customer.nickname}</h2>

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
                        {customer.gender ? t(`gender.${customer.gender}`) : '-'}
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
            </Card>
        </div>
    )
}
