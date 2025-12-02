'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { getFileUrl } from '@/lib/utils'

const { TextArea } = Input

interface DocumentField {
  key: string
  label: string
}

const documentFields: DocumentField[] = [
  { key: 'teihon', label: '藤本' },
  { key: 'financial_report', label: '决算报告书' },
  { key: 'industry_license', label: '行业许可证' },
  { key: 'gmo_contract', label: 'GMO合同' },
  { key: 'otit_materials', label: 'OTIT资料' },
  { key: 'central_materials', label: '中央会资料' },
]

export default function CreateCompanyPage() {
  const router = useRouter()
  const { canAccessCompanies } = useAuth()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [fileLists, setFileLists] = useState<Record<string, UploadFile[]>>({})

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
      message.success(`${file.name} 上传成功`)
    } catch (error) {
      console.error('上传失败:', error)
      onError(error)
      message.error(`${file.name} 上传失败`)
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
      const documentUrls: Record<string, string[]> = {}
      documentFields.forEach(field => {
        const files = fileLists[field.key] || []
        const urls = files
          .filter(file => file.status === 'done' && file.url)
          .map(file => file.url as string)
        if (urls.length > 0) {
          documentUrls[field.key] = urls
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

      message.success('创建企业成功')
      router.push(`/companies/${data.id}`)
    } catch (error) {
      console.error('创建企业失败:', error)
      message.error('创建企业失败')
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
        返回
      </Button>

      <Card title="创建企业">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="会社名称"
                rules={[{ required: true, message: '请输入会社名称' }]}
              >
                <Input placeholder="请输入会社名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="legal_number"
                label="法人番号"
                rules={[{ required: true, message: '请输入法人番号' }]}
              >
                <Input placeholder="请输入法人番号" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="representative"
                label="代表取缔役"
                rules={[{ required: true, message: '请输入代表取缔役' }]}
              >
                <Input placeholder="请输入代表取缔役" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="industry"
                label="所属行业"
                rules={[{ required: true, message: '请输入所属行业' }]}
              >
                <Input placeholder="请输入所属行业" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="employee_count"
                label="公司从业人数"
              >
                <InputNumber
                  placeholder="请输入公司从业人数"
                  min={0}
                  style={{ width: '100%' }}
                  addonAfter="人"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="registered_capital"
                label="注册资本金"
              >
                <Input placeholder="请输入注册资本金" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="address"
                label="公司地址"
              >
                <TextArea
                  placeholder="请输入公司地址"
                  rows={2}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="contact"
                label="联系方式"
              >
                <Input placeholder="请输入联系方式" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="email"
                label="联系邮箱"
              >
                <Input placeholder="请输入联系邮箱" />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ marginTop: 24, marginBottom: 16 }}>
            <h3>企业文档</h3>
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
                    <Button icon={<UploadOutlined />}>
                      上传文件
                    </Button>
                  </Upload>
                  {fileLists[field.key] && fileLists[field.key].length > 0 && (
                    <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                      已选择 {fileLists[field.key].length} 个文件
                    </div>
                  )}
                </Form.Item>
              </Col>
            ))}
          </Row>

          <Form.Item style={{ marginTop: 24 }}>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                保存
              </Button>
              <Button onClick={() => router.back()}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

