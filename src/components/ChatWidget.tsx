'use client'

import { useState, useEffect, useRef } from 'react'
import { Modal, Button, Input, List, Avatar, Badge, Spin, message, Empty } from 'antd'
import { MessageOutlined, SendOutlined, CloseOutlined } from '@ant-design/icons'
import { supabase, Conversation, Message } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import './ChatWidget.css'

const { TextArea } = Input

export default function ChatWidget() {
    const { user } = useAuth()
    const [visible, setVisible] = useState(false)
    const [conversations, setConversations] = useState<Conversation[]>([])
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [messageInput, setMessageInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [sending, setSending] = useState(false)
    const [unreadCount, setUnreadCount] = useState(0)
    const [conversationUnreadMap, setConversationUnreadMap] = useState<Record<string, number>>({})
    const [currentPage, setCurrentPage] = useState(1)
    const [hasMore, setHasMore] = useState(true)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const messageIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const unreadIntervalRef = useRef<NodeJS.Timeout | null>(null)

    const PAGE_SIZE = 20

    const messageListRef = useRef<HTMLDivElement>(null)

    // 滚动到底部
    const scrollToBottom = (instant: boolean = false) => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({
                behavior: instant ? 'auto' : 'smooth',
                block: 'end'
            })
        }
    }

    // 获取对话列表
    const fetchConversations = async () => {
        if (!user?.id) return

        try {
            // const { data, error } = await supabase
            //     .from('conversations')
            //     .select('id, user1_id, user1_name, user2_id, user2_name, last_message, last_message_time, created_at, updated_at')
            //     .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
            //     .order('last_message_time', { ascending: false })

            // if (error) throw error
            // setConversations(data || [])
            setConversations([])

            // 获取每个对话的未读消息数
            // if (data && data.length > 0) {
            //     const unreadMap: Record<string, number> = {}
            //     await Promise.all(data.map(async (conv) => {
            //         const { count, error: countError } = await supabase
            //             .from('messages')
            //             .select('*', { count: 'exact', head: true })
            //             .eq('conversation_id', conv.id)
            //             .neq('sender_id', user.id)
            //             .eq('is_read', false)

            //         if (!countError) {
            //             unreadMap[conv.id] = count || 0
            //         }
            //     }))
            //     setConversationUnreadMap(unreadMap)
            // }
            setConversationUnreadMap({})
        } catch (error) {
            console.error('获取对话列表失败:', error)
        }
    }

    // 获取未读消息数
    const fetchUnreadCount = async () => {
        if (!user?.id) return

        try {
            // const { data: conversationData, error: convError } = await supabase
            //     .from('conversations')
            //     .select('id')
            //     .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)

            // if (convError) throw convError

            // const conversationIds = conversationData?.map(c => c.id) || []

            // if (conversationIds.length === 0) {
            //     setUnreadCount(0)
            //     return
            // }

            // const { data, error, count } = await supabase
            //     .from('messages')
            //     .select('*', { count: 'exact', head: true })
            //     .in('conversation_id', conversationIds)
            //     .neq('sender_id', user.id)
            //     .eq('is_read', false)

            // if (error) throw error
            // setUnreadCount(count || 0)
            setUnreadCount(0)
        } catch (error) {
            console.error('获取未读消息数失败:', error)
        }
    }

    // 获取消息列表
    const fetchMessages = async (conversationId: string, page: number = 1, silent: boolean = false) => {
        if (!silent) {
            setLoading(true)
        }
        try {
            // const from = (page - 1) * PAGE_SIZE
            // const to = from + PAGE_SIZE - 1

            // const { data, error } = await supabase
            //     .from('messages')
            //     .select('id, conversation_id, sender_id, sender_name, content, is_read, created_at')
            //     .eq('conversation_id', conversationId)
            //     .order('created_at', { ascending: false })
            //     .range(from, to)

            // if (error) throw error

            // const reversedData = (data || []).reverse()

            // if (page === 1) {
            //     setMessages(reversedData)
            // } else {
            //     setMessages(prev => [...reversedData, ...prev])
            // }

            // setHasMore(data && data.length === PAGE_SIZE)
            if (page === 1) {
                setMessages([])
            }
            setHasMore(false)

            // 标记消息为已读
            await markMessagesAsRead(conversationId)

            if (page === 1 && !silent) {
                // 初始加载使用即时滚动，避免动画延迟
                setTimeout(() => scrollToBottom(true), 100)
            } else if (page === 1 && silent) {
                // 静默刷新（新消息）时，如果用户在底部，则平滑滚动
                if (messageListRef.current) {
                    const { scrollTop, scrollHeight, clientHeight } = messageListRef.current
                    // 如果距离底部小于100px，则自动滚动
                    if (scrollHeight - scrollTop - clientHeight < 100) {
                        scrollToBottom(false)
                    }
                }
            }
        } catch (error) {
            console.error('获取消息列表失败:', error)
            if (!silent) {
                message.error('获取消息列表失败')
            }
        } finally {
            if (!silent) {
                setLoading(false)
            }
        }
    }

    // 标记消息为已读
    const markMessagesAsRead = async (conversationId: string) => {
        if (!user?.id) return

        try {
            // await supabase
            //     .from('messages')
            //     .update({ is_read: true })
            //     .eq('conversation_id', conversationId)
            //     .neq('sender_id', user.id)
            //     .eq('is_read', false)

            fetchUnreadCount()
            fetchConversations()
        } catch (error) {
            console.error('标记消息已读失败:', error)
        }
    }

    // 发送消息
    const handleSendMessage = async () => {
        if (!messageInput.trim() || !selectedConversation || !user) return

        if (messageInput.length > 500) {
            message.error('消息长度不能超过500字')
            return
        }

        setSending(true)
        try {
            // 插入消息
            // const { data: messageData, error: messageError } = await supabase
            //     .from('messages')
            //     .insert([{
            //         conversation_id: selectedConversation.id,
            //         sender_id: user.id,
            //         sender_name: user.username,
            //         content: messageInput.trim(),
            //         is_read: false
            //     }])
            //     .select()
            //     .single()

            // if (messageError) throw messageError

            // // 更新对话的最后消息
            // await supabase
            //     .from('conversations')
            //     .update({
            //         last_message: messageInput.trim(),
            //         last_message_time: new Date().toISOString()
            //     })
            //     .eq('id', selectedConversation.id)

            // setMessages(prev => [...prev, messageData])
            const mockMessage: Message = {
                id: Date.now().toString(),
                conversation_id: selectedConversation.id,
                sender_id: user.id,
                sender_name: user.username,
                content: messageInput.trim(),
                is_read: false,
                created_at: new Date().toISOString()
            }
            setMessages(prev => [...prev, mockMessage])

            setMessageInput('')
            // fetchConversations()
            setTimeout(() => scrollToBottom(false), 100)
        } catch (error) {
            console.error('发送消息失败:', error)
            message.error('发送消息失败')
        } finally {
            setSending(false)
        }
    }

    // 打开对话
    const handleSelectConversation = (conversation: Conversation) => {
        setSelectedConversation(conversation)
        setCurrentPage(1)
        setMessages([])
        fetchMessages(conversation.id, 1)
    }

    // 加载更多历史消息
    const handleLoadMore = () => {
        if (!selectedConversation || !hasMore) return
        const nextPage = currentPage + 1
        setCurrentPage(nextPage)
        fetchMessages(selectedConversation.id, nextPage)
    }

    // 创建或获取对话
    const createOrGetConversation = async (targetUserId: string, targetUserName: string) => {
        if (!user) return

        try {
            // 调用数据库函数获取或创建对话
            // const { data, error } = await supabase.rpc('get_or_create_conversation', {
            //     p_user1_id: user.id,
            //     p_user1_name: user.username,
            //     p_user2_id: targetUserId,
            //     p_user2_name: targetUserName
            // })

            // if (error) throw error

            // // 刷新对话列表
            // await fetchConversations()

            // // 查找并选中该对话
            // const { data: conversationData, error: convError } = await supabase
            //     .from('conversations')
            //     .select('*')
            //     .eq('id', data)
            //     .single()

            // if (convError) throw convError

            const mockConversation: Conversation = {
                id: 'mock-conversation-id',
                user1_id: user.id,
                user1_name: user.username,
                user2_id: targetUserId,
                user2_name: targetUserName,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                last_message: '',
                last_message_time: new Date().toISOString()
            }

            setVisible(true)
            handleSelectConversation(mockConversation)
        } catch (error) {
            console.error('创建对话失败:', error)
            message.error('创建对话失败')
        }
    }

    // 获取对方用户名
    const getOtherUserName = (conversation: Conversation) => {
        if (!user) return ''
        return conversation.user1_id === user.id ? conversation.user2_name : conversation.user1_name
    }

    // 获取对方用户ID
    const getOtherUserId = (conversation: Conversation) => {
        if (!user) return ''
        return conversation.user1_id === user.id ? conversation.user2_id : conversation.user1_id
    }

    // 定时轮询
    useEffect(() => {
        if (!user?.id) return

        // 初始加载
        fetchConversations()
        fetchUnreadCount()

        // 未读消息轮询（10秒）
        // unreadIntervalRef.current = setInterval(fetchUnreadCount, 10000)

        return () => {
            if (unreadIntervalRef.current) {
                clearInterval(unreadIntervalRef.current)
            }
        }
    }, [user?.id])

    // 打开消息中心时静默刷新数据
    useEffect(() => {
        if (visible && user?.id) {
            // 静默刷新对话列表和未读消息数
            fetchConversations()
            fetchUnreadCount()
        }
    }, [visible, user?.id])

    // 对话消息轮询
    useEffect(() => {
        if (selectedConversation && visible) {
            // 对话消息轮询（5秒，静默刷新）
            // messageIntervalRef.current = setInterval(() => {
            //     fetchMessages(selectedConversation.id, 1, true) // 静默刷新
            // }, 5000)
        }

        return () => {
            if (messageIntervalRef.current) {
                clearInterval(messageIntervalRef.current)
            }
        }
    }, [selectedConversation, visible])

    // 暴露方法供外部调用
    useEffect(() => {
        if (typeof window !== 'undefined') {
            (window as any).openChat = createOrGetConversation
        }
    }, [user])

    return (
        <>
            {/* 悬浮按钮 */}
            <div className="chat-float-button" onClick={() => setVisible(true)}>
                <Badge count={unreadCount} offset={[-5, 5]}>
                    <MessageOutlined style={{ fontSize: 24, color: '#fff' }} />
                </Badge>
            </div>

            {/* 聊天面板Modal */}
            <Modal
                title="消息中心"
                open={visible}
                onCancel={() => setVisible(false)}
                footer={null}
                width="50vw"
                style={{ top: '25vh' }}
                styles={{ body: { height: '50vh', padding: 0 } }}
                destroyOnClose
            >
                <div style={{ display: 'flex', height: '100%' }}>
                    {/* 左侧联系人列表 */}
                    <div style={{ width: '35%', borderRight: '1px solid #f0f0f0', overflowY: 'auto' }}>
                        {conversations.length === 0 ? (
                            <Empty
                                description="暂无联系人"
                                style={{ marginTop: 100 }}
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                            />
                        ) : (
                            <List
                                dataSource={conversations}
                                renderItem={conversation => (
                                    <List.Item
                                        key={conversation.id}
                                        onClick={() => handleSelectConversation(conversation)}
                                        style={{
                                            cursor: 'pointer',
                                            backgroundColor: selectedConversation?.id === conversation.id ? '#f0f0f0' : 'transparent',
                                            padding: '12px 16px'
                                        }}
                                    >
                                        <List.Item.Meta
                                            avatar={<Avatar>{getOtherUserName(conversation)[0]}</Avatar>}
                                            title={
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span>{getOtherUserName(conversation)}</span>
                                                    {(conversationUnreadMap[conversation.id] || 0) > 0 && (
                                                        <Badge count={conversationUnreadMap[conversation.id]} />
                                                    )}
                                                </div>
                                            }
                                            description={
                                                <div style={{
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    maxWidth: '200px'
                                                }}>
                                                    {conversation.last_message || '暂无消息'}
                                                </div>
                                            }
                                        />
                                    </List.Item>
                                )}
                            />
                        )}
                    </div>

                    {/* 右侧聊天区域 */}
                    <div style={{ width: '65%', display: 'flex', flexDirection: 'column' }}>
                        {selectedConversation ? (
                            <>
                                {/* 聊天标题 */}
                                <div style={{
                                    padding: '12px 16px',
                                    borderBottom: '1px solid #f0f0f0',
                                    fontWeight: 'bold'
                                }}>
                                    {getOtherUserName(selectedConversation)}
                                </div>

                                {/* 消息列表 */}
                                <div
                                    ref={messageListRef}
                                    style={{
                                        flex: 1,
                                        overflowY: 'auto',
                                        padding: '16px',
                                        backgroundColor: '#fafafa'
                                    }}
                                >
                                    {hasMore && (
                                        <div style={{ textAlign: 'center', marginBottom: 16 }}>
                                            <Button size="small" onClick={handleLoadMore} loading={loading}>
                                                加载更多
                                            </Button>
                                        </div>
                                    )}

                                    {loading && currentPage === 1 ? (
                                        <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                            <Spin />
                                        </div>
                                    ) : (
                                        messages.map(msg => (
                                            <div
                                                key={msg.id}
                                                style={{
                                                    marginBottom: 12,
                                                    display: 'flex',
                                                    justifyContent: msg.sender_id === user?.id ? 'flex-end' : 'flex-start'
                                                }}
                                            >
                                                <div style={{
                                                    maxWidth: '70%',
                                                    backgroundColor: msg.sender_id === user?.id ? '#1890ff' : '#fff',
                                                    color: msg.sender_id === user?.id ? '#fff' : '#000',
                                                    padding: '8px 12px',
                                                    borderRadius: 8,
                                                    wordBreak: 'break-word'
                                                }}>
                                                    <div>{msg.content}</div>
                                                    <div style={{
                                                        fontSize: 11,
                                                        marginTop: 4,
                                                        opacity: 0.7
                                                    }}>
                                                        {new Date(msg.created_at).toLocaleString('zh-CN', {
                                                            month: '2-digit',
                                                            day: '2-digit',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* 输入框 */}
                                <div style={{ padding: '12px 16px', borderTop: '1px solid #f0f0f0' }}>
                                    <TextArea
                                        value={messageInput}
                                        onChange={e => setMessageInput(e.target.value)}
                                        onPressEnter={(e) => {
                                            if (!e.shiftKey) {
                                                e.preventDefault()
                                                handleSendMessage()
                                            }
                                        }}
                                        placeholder="输入消息（最多500字，Shift+Enter换行）"
                                        maxLength={500}
                                        autoSize={{ minRows: 2, maxRows: 4 }}
                                    />
                                    <div style={{
                                        marginTop: 8,
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <span style={{ color: '#999', fontSize: 12 }}>
                                            {messageInput.length}/500
                                        </span>
                                        <Button
                                            type="primary"
                                            icon={<SendOutlined />}
                                            onClick={handleSendMessage}
                                            loading={sending}
                                        >
                                            发送
                                        </Button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <Empty
                                description="暂无对话"
                                style={{ marginTop: 100 }}
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                            />
                        )}
                    </div>
                </div>
            </Modal>
        </>
    )
}
