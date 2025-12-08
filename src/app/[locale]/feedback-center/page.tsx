'use client'

import { useState, useEffect } from 'react'
import { Card, Table, Tabs, Tag, Button, Modal, Input, message, Space } from 'antd'
import { CheckOutlined, CloseOutlined, EyeOutlined } from '@ant-design/icons'
import { supabase, type Feedback } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslations } from 'next-intl'

const { TextArea } = Input

export default function FeedbackCenterPage() {
    const { user, isAdmin, isChineseEmployee, isJapaneseEmployee } = useAuth()
    const t = useTranslations('FeedbackCenter')
    const tCommon = useTranslations('Common')

    const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
    const [loading, setLoading] = useState(false)
    const [activeTab, setActiveTab] = useState('pending')
    const [rejectModalVisible, setRejectModalVisible] = useState(false)
    const [currentFeedback, setCurrentFeedback] = useState<Feedback | null>(null)
    const [rejectReason, setRejectReason] = useState('')
    const [detailModalVisible, setDetailModalVisible] = useState(false)

    // 获取反馈列表
    const fetchFeedbacks = async () => {
        if (!user) return
        setLoading(true)
        try {
            // 先获取反馈数据
            let query = supabase
                .from('feedbacks')
                .select('*')
                .eq('status', activeTab)
                .order('created_at', { ascending: false })

            // 根据角色过滤
            if (isJapaneseEmployee && !isAdmin) {
                // 日方员工只看自己提交的
                query = query.eq('submitter_id', user.id)
            } else if (isChineseEmployee && !isAdmin) {
                // 中方员工只看自己需要处理的
                query = query.eq('handler_id', user.id)
            }
            // 管理员可以看到所有

            const { data, error } = await query

            if (error) throw error

            // 获取用户名映射
            if (data && data.length > 0) {
                const userIds = [...new Set([
                    ...data.map(f => f.submitter_id),
                    ...data.map(f => f.handler_id)
                ])]

                const { data: users } = await supabase
                    .from('users')
                    .select('id, username')
                    .in('id', userIds)

                const userMap: Record<string, string> = {}
                users?.forEach(u => { userMap[u.id] = u.username })

                // 获取应聘者名称
                const applicantIds = [...new Set(data.map(f => f.applicant_id))]
                const { data: applicants } = await supabase
                    .from('customers')
                    .select('id, real_name, nickname')
                    .in('id', applicantIds)

                const applicantMap: Record<string, string> = {}
                applicants?.forEach(a => { applicantMap[a.id] = a.real_name || a.nickname || '未知' })

                // 合并数据
                const enrichedData = data.map(f => ({
                    ...f,
                    submitter_name: userMap[f.submitter_id] || '未知',
                    handler_name: userMap[f.handler_id] || '未知',
                    applicant_name: applicantMap[f.applicant_id] || '未知'
                }))

                setFeedbacks(enrichedData)
            } else {
                setFeedbacks([])
            }
        } catch (error) {
            console.error('获取反馈列表失败:', error)
            message.error(t('messages.fetchError'))
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchFeedbacks()
    }, [user, activeTab])

    // 完成反馈
    const handleComplete = async (feedback: Feedback) => {
        try {
            const { error } = await supabase
                .from('feedbacks')
                .update({ status: 'completed' })
                .eq('id', feedback.id)

            if (error) throw error
            message.success(t('messages.completeSuccess'))
            fetchFeedbacks()
        } catch (error) {
            console.error('完成反馈失败:', error)
            message.error(t('messages.completeError'))
        }
    }

    // 驳回反馈
    const handleReject = async () => {
        if (!currentFeedback || !rejectReason.trim()) {
            message.warning(t('messages.rejectReasonRequired'))
            return
        }

        try {
            const { error } = await supabase
                .from('feedbacks')
                .update({
                    status: 'rejected',
                    reject_reason: rejectReason
                })
                .eq('id', currentFeedback.id)

            if (error) throw error
            message.success(t('messages.rejectSuccess'))
            setRejectModalVisible(false)
            setRejectReason('')
            setCurrentFeedback(null)
            fetchFeedbacks()
        } catch (error) {
            console.error('驳回反馈失败:', error)
            message.error(t('messages.rejectError'))
        }
    }

    // 查看详情
    const handleViewDetail = (feedback: Feedback) => {
        setCurrentFeedback(feedback)
        setDetailModalVisible(true)
    }

    // 表格列定义
    const columns = [
        {
            title: t('columns.applicantName'),
            dataIndex: 'applicant_name',
            key: 'applicant_name',
            width: 120,
        },
        {
            title: t('columns.fields'),
            dataIndex: 'fields',
            key: 'fields',
            width: 200,
            render: (fields: string[]) => (
                <Space wrap>
                    {fields?.slice(0, 3).map(f => (
                        <Tag key={f} color="blue">{t(`fieldLabels.${f}`)}</Tag>
                    ))}
                    {fields?.length > 3 && <Tag>+{fields.length - 3}</Tag>}
                </Space>
            )
        },
        {
            title: t('columns.content'),
            dataIndex: 'content',
            key: 'content',
            width: 200,
            ellipsis: true,
        },
        // 根据角色显示不同列
        ...(isChineseEmployee || isAdmin ? [{
            title: t('columns.submitter'),
            dataIndex: 'submitter_name',
            key: 'submitter_name',
            width: 100,
        }] : []),
        ...(isJapaneseEmployee || isAdmin ? [{
            title: t('columns.handler'),
            dataIndex: 'handler_name',
            key: 'handler_name',
            width: 100,
        }] : []),
        {
            title: t('columns.status'),
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (status: string) => {
                const colorMap: Record<string, string> = {
                    pending: 'orange',
                    completed: 'green',
                    rejected: 'red'
                }
                return <Tag color={colorMap[status]}>{t(`status.${status}`)}</Tag>
            }
        },
        {
            title: t('columns.createdAt'),
            dataIndex: 'created_at',
            key: 'created_at',
            width: 150,
            render: (date: string) => new Date(date).toLocaleString()
        },
        {
            title: t('columns.actions'),
            key: 'actions',
            width: 150,
            render: (_: any, record: Feedback) => (
                <Space>
                    <Button
                        type="link"
                        icon={<EyeOutlined />}
                        onClick={() => handleViewDetail(record)}
                    >
                        {tCommon('view')}
                    </Button>
                    {/* 中方员工和管理员可以处理待处理的反馈 */}
                    {(isChineseEmployee || isAdmin) && record.status === 'pending' && (
                        <>
                            <Button
                                type="link"
                                icon={<CheckOutlined />}
                                style={{ color: 'green' }}
                                onClick={() => handleComplete(record)}
                            >
                                {t('actions.complete')}
                            </Button>
                            <Button
                                type="link"
                                danger
                                icon={<CloseOutlined />}
                                onClick={() => {
                                    setCurrentFeedback(record)
                                    setRejectModalVisible(true)
                                }}
                            >
                                {t('actions.reject')}
                            </Button>
                        </>
                    )}
                </Space>
            )
        }
    ]

    const tabItems = [
        { key: 'pending', label: t('tabs.pending') },
        { key: 'completed', label: t('tabs.completed') },
        { key: 'rejected', label: t('tabs.rejected') },
    ]

    return (
        <div>
            <Card>
                <h2>{t('title')}</h2>
                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    items={tabItems}
                />
                <Table
                    columns={columns}
                    dataSource={feedbacks}
                    loading={loading}
                    rowKey="id"
                    pagination={{
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total) => `${t('pagination.total')} ${total} ${t('pagination.items')}`,
                    }}
                    scroll={{ x: 'max-content' }}
                />
            </Card>

            {/* 驳回原因弹窗 */}
            <Modal
                title={t('rejectModal.title')}
                open={rejectModalVisible}
                onOk={handleReject}
                onCancel={() => {
                    setRejectModalVisible(false)
                    setRejectReason('')
                    setCurrentFeedback(null)
                }}
                okText={t('rejectModal.confirm')}
                cancelText={tCommon('cancel')}
            >
                <TextArea
                    rows={4}
                    placeholder={t('rejectModal.placeholder')}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                />
            </Modal>

            {/* 详情弹窗 */}
            <Modal
                title={t('detailModal.title')}
                open={detailModalVisible}
                onCancel={() => {
                    setDetailModalVisible(false)
                    setCurrentFeedback(null)
                }}
                footer={[
                    <Button key="close" onClick={() => setDetailModalVisible(false)}>
                        {tCommon('close')}
                    </Button>
                ]}
                width={600}
            >
                {currentFeedback && (
                    <div>
                        <p><strong>{t('columns.applicantName')}:</strong> {currentFeedback.applicant_name}</p>
                        <p><strong>{t('columns.submitter')}:</strong> {currentFeedback.submitter_name}</p>
                        <p><strong>{t('columns.handler')}:</strong> {currentFeedback.handler_name}</p>
                        <p><strong>{t('columns.fields')}:</strong></p>
                        <Space wrap style={{ marginBottom: 16 }}>
                            {currentFeedback.fields?.map(f => (
                                <Tag key={f} color="blue">{t(`fieldLabels.${f}`)}</Tag>
                            ))}
                        </Space>
                        <p><strong>{t('columns.content')}:</strong></p>
                        <p style={{ whiteSpace: 'pre-wrap', background: '#f5f5f5', padding: 12, borderRadius: 4 }}>
                            {currentFeedback.content}
                        </p>
                        {currentFeedback.status === 'rejected' && currentFeedback.reject_reason && (
                            <>
                                <p><strong>{t('detailModal.rejectReason')}:</strong></p>
                                <p style={{ whiteSpace: 'pre-wrap', background: '#fff1f0', padding: 12, borderRadius: 4, color: 'red' }}>
                                    {currentFeedback.reject_reason}
                                </p>
                            </>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    )
}
