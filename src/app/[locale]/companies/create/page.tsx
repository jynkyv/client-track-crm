'use client'

import { useState } from 'react'
import { useRouter } from '@/navigation'
import {
  Card,
  Button,
  Form,
  Input,
  InputNumber,
  Row,
  Col,
  Upload,
  message,
  Space
} from 'antd'
import type { UploadFile } from 'antd'
import {
  ArrowLeftOutlined,
  UploadOutlined,
  FilePdfOutlined
} from '@ant-design/icons'
import { supabase, type DocumentFile } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { getFileUrl } from '@/lib/utils'
import { useTranslations } from 'next-intl'

const { TextArea } = Input

interface DocumentField {
  key: string
  label: string
}

export default function CreateCompanyPage() {
  const router = useRouter()
  const { canAccessCompanies } = useAuth()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState<Record<string, boolean>>({})
  const [fileLists, setFileLists] = useState<Record<string, UploadFile[]>>({})
  const t = useTranslations('Company')
  const tCommon = useTranslations('Common')

  const documentFields: DocumentField[] = [
    { key: 'teihon', label: t('columns.teihon') },
    { key: 'financial_report', label: t('columns.financialReport') },
    { key: 'industry_license', label: t('columns.industryLicense') },
    { key: 'gmo_contract', label: t('columns.gmoContract') },
    { key: 'otit_materials', label: t('columns.otitMaterials') },
    { key: 'central_materials', label: t('columns.centralMaterials') },
  ]

  if (!canAccessCompanies) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <h2>权限不足</h2>
          <p>您没有权限访问此页面</p>
        </div>
      </Card>
    )
  }

  // 处理文件上传
  const handleUpload = async (options: any, field: string) => {
    const { file, onSuccess, onError } = options

    setUploading(prev => ({ ...prev, [field]: true }))

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

      // 更新文件列表
      setFileLists(prev => {
        const currentList = prev[field] || []
        const newFile = {
          uid: file.uid,
          name: file.name,
          status: 'done',
          url: getFileUrl(url), // Use getFileUrl to construct the public URL
          response: { url } // Store the raw path/key in response
        } as UploadFile
        return {
          ...prev,
          [field]: [...currentList, newFile]
        }
      })

      onSuccess({ url })
      message.success(`${file.name} ${t('messages.uploadSuccess')}`)
    } catch (error) {
      console.error('上传失败:', error)
      onError(error)
      message.error(`${file.name} ${t('messages.uploadError')}`)
    } finally {
      setUploading(prev => ({ ...prev, [field]: false }))
    }
  }

  // 处理文件移除
  const handleRemove = (file: UploadFile, field: string) => {
    setFileLists(prev => {
      const currentList = prev[field] || []
      return {
        ...prev,
        [field]: currentList.filter(f => f.uid !== file.uid)
      }
    })
  }

  // 提交表单
  const handleSubmit = async (values: any) => {
    setLoading(true)
    try {
      // 收集所有上传的文件URL
      const documentUrls: Record<string, DocumentFile[]> = {}
      documentFields.forEach(field => {
        const files = fileLists[field.key] || []
        const currentFiles = files
          .filter(file => file.status === 'done' && file.url)
          .map(file => ({
            url: file.url as string,
            uploadedAt: new Date().toISOString()
          }))
        if (currentFiles.length > 0) {
          documentUrls[field.key] = currentFiles
        }
      })

      // 创建企业数据
      const companyData = {
        name: values.name,
        legal_number: values.legal_number,
        representative: values.representative,
        industry: values.industry,
        employee_count: values.employee_count || null,
        registered_capital: values.registered_capital || null,
        address: values.address || null,
        contact: values.contact || null,
        email: values.email || null,
        ...documentUrls
      }

      const { data, error } = await supabase
        .from('companies')
        .insert([companyData])
        .select()
        .single()

      if (error) throw error

      message.success(t('messages.createSuccess'))
      router.replace(`/companies/${data.id}`)
    } catch (error) {
      console.error('创建企业失败:', error)
      message.error(t('messages.createError'))
    } finally {
      setLoading(false)
    }
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

      <Card title={t('create')}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label={t('form.name')}
                rules={[{ required: true, message: t('form.namePlaceholder') }]}
              >
                <Input placeholder={t('form.namePlaceholder')} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="legal_number"
                label={t('form.legalNumber')}
                rules={[{ required: true, message: t('form.legalNumberPlaceholder') }]}
              >
                <Input placeholder={t('form.legalNumberPlaceholder')} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="representative"
                label={t('form.representative')}
                rules={[{ required: true, message: t('form.representativePlaceholder') }]}
              >
                <Input placeholder={t('form.representativePlaceholder')} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="industry"
                label={t('form.industry')}
                rules={[{ required: true, message: t('form.industryPlaceholder') }]}
              >
                <Input placeholder={t('form.industryPlaceholder')} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="employee_count"
                label={t('form.employeeCount')}
              >
                <InputNumber
                  placeholder={t('form.employeeCountPlaceholder')}
                  min={0}
                  style={{ width: '100%' }}
                  addonAfter="人"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="registered_capital"
                label={t('form.registeredCapital')}
              >
                <Input placeholder={t('form.registeredCapitalPlaceholder')} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="address"
                label={t('form.address')}
              >
                <TextArea
                  placeholder={t('form.addressPlaceholder')}
                  rows={2}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="contact"
                label={t('form.contact')}
              >
                <Input placeholder={t('form.contactPlaceholder')} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="email"
                label={t('form.email')}
              >
                <Input placeholder={t('form.emailPlaceholder')} />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ marginTop: 24, marginBottom: 16 }}>
            <h3>{t('form.documents')}</h3>
          </div>

          <Row gutter={[16, 16]}>
            {documentFields.map((field) => (
              <Col xs={24} sm={12} md={8} key={field.key}>
                <Form.Item
                  name={field.key}
                  label={field.label}
                >
                  <Upload
                    fileList={fileLists[field.key] || []}
                    customRequest={(options) => handleUpload(options, field.key)}
                    onRemove={(file) => handleRemove(file, field.key)}
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                  >
                    <Button icon={<UploadOutlined />} loading={uploading[field.key]}>
                      {t('upload.selectFiles')}
                    </Button>
                  </Upload>
                  {
                    fileLists[field.key] && fileLists[field.key].length > 0 && (
                      <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                        {t('upload.selected')} {fileLists[field.key].length}
                      </div>
                    )
                  }
                </Form.Item >
              </Col >
            ))
            }
          </Row >

          <Form.Item style={{ marginTop: 24 }}>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                {t('form.save')}
              </Button>
              <Button onClick={() => router.back()}>
                {t('form.cancel')}
              </Button>
            </Space>
          </Form.Item >
        </Form >
      </Card >
    </div >
  )
}

