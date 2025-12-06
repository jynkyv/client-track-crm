'use client'

import { useState } from 'react'
import { useRouter } from '@/navigation'
import { Form, Input, Button, Card, message } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslations } from 'next-intl'

import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()
  const t = useTranslations('Login')

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true)
    try {
      const success = await login(values.username, values.password)
      if (success) {
        message.success(t('loginSuccess'))
        router.push('/dashboard')
      } else {
        message.error(t('loginError'))
      }
    } catch {
      message.error(t('loginFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      position: 'relative'
    }}>
      <div style={{ position: 'absolute', top: 20, right: 20 }}>
        <LanguageSwitcher />
      </div>
      <Card
        title={t('title')}
        style={{
          width: 400,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          borderRadius: '8px'
        }}
        styles={{
          header: {
            textAlign: 'center',
            fontSize: '20px',
            fontWeight: '500',
            color: '#333',
            borderBottom: '1px solid #f0f0f0'
          }
        }}
      >
        <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: t('usernameRequired') }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder={t('username')}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: t('passwordRequired') }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder={t('password')}
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              style={{ width: '100%' }}
            >
              {t('login')}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
