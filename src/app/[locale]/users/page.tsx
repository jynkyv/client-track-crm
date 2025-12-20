'use client'

import { useState, useEffect } from 'react'
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Popconfirm,
  message,
  Card
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { supabase, User } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslations } from 'next-intl'

const { Option } = Select

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [form] = Form.useForm()
  const { isAdmin } = useAuth()
  const t = useTranslations('User')
  const tCommon = useTranslations('Common')

  useEffect(() => {
    if (isAdmin) {
      fetchUsers()
    }
  }, [isAdmin])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      message.error(t('messages.fetchError'))
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingUser(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (record: User) => {
    setEditingUser(record)
    form.setFieldsValue(record)
    setModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id)

      if (error) throw error
      message.success(t('messages.deleteSuccess'))
      fetchUsers()
    } catch (error) {
      message.error(t('messages.deleteError'))
    }
  }

  const handleSubmit = async (values: any) => {
    try {
      if (editingUser) {
        const oldUsername = editingUser.username
        const newUsername = values.username

        // 更新用户信息
        const { error } = await supabase
          .from('users')
          .update(values)
          .eq('id', editingUser.id)

        if (error) throw error

        // 如果用户名发生变化，同步更新所有相关表的 owner 字段
        if (oldUsername !== newUsername) {
          // 更新 customers 表的 owner 字段
          await supabase
            .from('customers')
            .update({ owner: newUsername })
            .eq('owner', oldUsername)

          // 更新 work_orders 表的 owner_name 字段
          await supabase
            .from('work_orders')
            .update({ owner_name: newUsername })
            .eq('owner_name', oldUsername)

          // 更新 applicants 表的 owner_name 字段
          await supabase
            .from('applicants')
            .update({ owner_name: newUsername })
            .eq('owner_name', oldUsername)

          // 更新 conversations 表的 user1_name 字段
          await supabase
            .from('conversations')
            .update({ user1_name: newUsername })
            .eq('user1_name', oldUsername)

          // 更新 conversations 表的 user2_name 字段
          await supabase
            .from('conversations')
            .update({ user2_name: newUsername })
            .eq('user2_name', oldUsername)

          // 更新 messages 表的 sender_name 字段
          await supabase
            .from('messages')
            .update({ sender_name: newUsername })
            .eq('sender_name', oldUsername)
        }

        message.success(t('messages.updateSuccess'))
      } else {
        const { error } = await supabase
          .from('users')
          .insert([values])

        if (error) throw error
        message.success(t('messages.addSuccess'))
      }
      setModalVisible(false)
      fetchUsers()
    } catch (error) {
      message.error(t('messages.operationError'))
    }
  }

  const columns = [
    {
      title: t('columns.username'),
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: t('columns.role'),
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <span style={{
          color: role === 'admin' ? '#ff4d4f' : '#1890ff',
          fontWeight: 'bold'
        }}>
          {role === 'admin' ? t('roles.admin') : t('roles.employee')}
        </span>
      ),
    },
    {
      title: t('columns.country'),
      dataIndex: 'country',
      key: 'country',
      render: (country: string) => country || '-',
    },
    {
      title: t('columns.createdAt'),
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: t('columns.actions'),
      key: 'action',
      render: (_: any, record: User) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            {t('actions.edit')}
          </Button>
          <Popconfirm
            title={t('actions.confirmDelete')}
            onConfirm={() => handleDelete(record.id)}
            okText={t('actions.confirm')}
            cancelText={t('actions.cancel')}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              {t('actions.delete')}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  if (!isAdmin) {
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
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <h2>{t('title')}</h2>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            {t('add')}
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={users}
          loading={loading}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
          scroll={{ x: 'max-content' }}
        />
      </Card>

      <Modal
        title={editingUser ? t('form.editTitle') : t('form.addTitle')}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="username"
            label={t('form.username')}
            rules={[{ required: true, message: t('form.usernamePlaceholder') }]}
          >
            <Input placeholder={t('form.usernamePlaceholder')} />
          </Form.Item>

          <Form.Item
            name="password"
            label={t('form.password')}
            rules={[{ required: true, message: t('form.passwordPlaceholder') }]}
          >
            <Input.Password placeholder={t('form.passwordPlaceholder')} />
          </Form.Item>

          <Form.Item
            name="role"
            label={t('form.role')}
            rules={[{ required: true, message: t('form.rolePlaceholder') }]}
          >
            <Select placeholder={t('form.rolePlaceholder')}>
              <Option value="admin">{t('roles.admin')}</Option>
              <Option value="employee">{t('roles.employee')}</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="country"
            label={t('form.country')}
            rules={[{ required: true, message: t('form.countryPlaceholder') }]}
          >
            <Select placeholder={t('form.countryPlaceholder')}>
              <Option value="中国">{t('countries.china')}</Option>
              <Option value="日本">{t('countries.japan')}</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingUser ? t('form.update') : t('form.add')}
              </Button>
              <Button onClick={() => setModalVisible(false)}>
                {t('form.cancel')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
