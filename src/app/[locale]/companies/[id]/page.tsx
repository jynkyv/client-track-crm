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
  Upload,
  message,
  Space,
  Modal,
  List,
  Form,
  Input,
  InputNumber,
  Switch,
  Select
} from 'antd'

const { Option } = Select

const INDUSTRIES = [
  { value: '農業・林業関係', label: '農業・林業関係' },
  { value: '漁業関係', label: '漁業関係' },
  { value: '建設関係', label: '建設関係' },
  { value: '食品製造関係', label: '食品製造関係' },
  { value: '繊維・衣服関係', label: '繊維・衣服関係' },
  { value: '機械・金属関係', label: '機械・金属関係' },
  { value: 'その他', label: 'その他' },
]
import type { UploadFile } from 'antd'
import {
  EditOutlined,
  ArrowLeftOutlined,
  UploadOutlined,
  FilePdfOutlined,
  EyeOutlined,
  DeleteOutlined
} from '@ant-design/icons'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { saveAs } from 'file-saver'
import { generateUnionJoinApplication } from '@/lib/pdfGenerator'
import { getFileUrl } from '@/lib/utils'
import { useTranslations, useLocale } from 'next-intl'

import { type Company, type DocumentFile } from '@/lib/supabase'

interface CompanyDetail extends Omit<Company, 'created_at' | 'updated_at'> {
  // Add any specific fields for detail view if needed, or just use Company
}

// 编辑企业信息表单组件
function EditCompanyForm({
  company,
  onSuccess,
  onCancel,
  t
}: {
  company: CompanyDetail | null
  onSuccess: () => void
  onCancel: () => void
  t: (key: string) => string
}) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (company) {
      form.setFieldsValue({
        name: company.name,
        legal_number: company.legal_number,
        representative: company.representative,
        industry: company.industry,
        is_association_member: company.is_association_member,
        employee_count: company.employee_count,
        registered_capital: company.registered_capital,
        address: company.address,
        intern_address: company.intern_address,
        contact: company.contact,
        email: company.email
      })
    }
  }, [company, form])

  const handleSubmit = async (values: any) => {
    if (!company) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          name: values.name,
          legal_number: values.legal_number,
          representative: values.representative,
          industry: values.industry,
          is_association_member: values.is_association_member,
          employee_count: values.employee_count || null,
          registered_capital: values.registered_capital || null,
          address: values.address || null,
          intern_address: values.intern_address || null,
          contact: values.contact || null,
          email: values.email || null
        })
        .eq('id', company.id)

      if (error) throw error
      onSuccess()
    } catch (error) {
      console.error('更新企业信息失败:', error)
      message.error(t('messages.updateError'))
    } finally {
      setLoading(false)
    }
  }

  if (!company) return null

  return (
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
            <Select placeholder={t('form.industryPlaceholder')}>
              {INDUSTRIES.map(i => (
                <Option key={i.value} value={i.value}>{i.label}</Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="is_association_member"
            label={t('columns.isAssociationMember')}
            valuePropName="checked"
          >
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>
        </Col>
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
      </Row>

      <Row gutter={16}>
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
            <Input.TextArea
              placeholder={t('form.addressPlaceholder')}
              rows={2}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="intern_address"
            label={t('form.internAddress')}
          >
            <Input.TextArea
              placeholder={t('form.internAddressPlaceholder')}
              rows={2}
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="contact"
            label={t('form.contact')}
          >
            <Input placeholder={t('form.contactPlaceholder')} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="email"
            label={t('form.email')}
          >
            <Input placeholder={t('form.emailPlaceholder')} />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item style={{ marginTop: 24, marginBottom: 0, textAlign: 'right' }}>
        <Space>
          <Button onClick={onCancel}>
            {t('form.cancel')}
          </Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            {t('form.save')}
          </Button>
        </Space>
      </Form.Item>
    </Form >
  )
}


export default function CompanyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { canAccessCompanies, isChineseEmployee, isAdmin } = useAuth()
  const companyId = params.id as string
  const isReadOnly = isChineseEmployee && !isAdmin // 中方员工（非管理员）只能查看
  const [company, setCompany] = useState<CompanyDetail | null>(null)
  const [workOrders, setWorkOrders] = useState<Array<{ id: string, name: string, position: string, recruit_count: number, salary: string, work_time: string, rest_days: string, benefits: string }>>([])
  const [loading, setLoading] = useState(false)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [uploadModalVisible, setUploadModalVisible] = useState(false)
  const [currentUploadField, setCurrentUploadField] = useState<string>('')
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [activeUploads, setActiveUploads] = useState(0)

  // 查看文件 Modal 状态
  const [viewModalVisible, setViewModalVisible] = useState(false)
  const [currentViewFiles, setCurrentViewFiles] = useState<DocumentFile[]>([])
  const [currentViewField, setCurrentViewField] = useState<string>('')

  const t = useTranslations('Company')
  const tCommon = useTranslations('Common')
  const locale = useLocale()
  const tWorkOrder = useTranslations('WorkOrder')

  const documentFields = [
    { key: 'teihon', label: t('columns.teihon') },
    { key: 'financial_report', label: t('columns.financialReport') },
    { key: 'industry_license', label: t('columns.industryLicense') },
    { key: 'gmo_contract', label: t('columns.gmoContract') },
    { key: 'otit_materials', label: t('columns.otitMaterials') },
    { key: 'central_materials', label: t('columns.centralMaterials') },
    { key: 'instructor_license', label: t('columns.instructorLicense') },
    { key: 'visa_application', label: t('columns.visaApplication') },
    { key: 'employment_contract', label: t('columns.employmentContract') },
    { key: 'association_application_form', label: t('columns.associationApplicationForm') },
  ]

  // 获取企业详情
  const fetchCompany = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single()

      if (error) throw error
      setCompany(data)
    } catch (error) {
      console.error('获取企业详情失败:', error)
      message.error(t('messages.fetchDetailError'))
    } finally {
      setLoading(false)
    }
  }

  // 获取工单列表
  const fetchWorkOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('work_orders')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setWorkOrders(data || [])
    } catch (error) {
      console.error('获取工单列表失败:', error)
    }
  }

  useEffect(() => {
    if (companyId) {
      fetchCompany()
      fetchWorkOrders() // 所有用户都加载工单信息
    }
  }, [companyId])

  // 查看多个PDF
  const handleViewPdfs = (files: DocumentFile[] | undefined, field: string) => {
    if (!files || files.length === 0) {
      message.warning(t('messages.noFileWarning'))
      return
    }
    setCurrentViewFiles(files)
    setCurrentViewField(field)
    setViewModalVisible(true)
  }

  // 删除单个PDF文件
  const handleDeleteFile = async (url: string, field: string) => {
    if (!company) return

    Modal.confirm({
      title: t('messages.confirmDeleteTitle'),
      content: t('messages.confirmDeleteContent'),
      okText: t('messages.confirmOk'),
      cancelText: t('messages.confirmCancel'),
      okButtonProps: { danger: true },
      async onOk() {
        try {
          // 从当前字段的文件列表中移除该文件
          const currentFiles = (company as any)[field] as DocumentFile[] || []
          const updatedFiles = currentFiles.filter((f) => f.url !== url)

          // 更新数据库
          const { error } = await supabase
            .from('companies')
            .update({ [field]: updatedFiles.length > 0 ? updatedFiles : null })
            .eq('id', company.id)

          if (error) throw error

          message.success(t('messages.deleteSuccess'))

          // 更新视图状态
          setCurrentViewFiles(updatedFiles)
          if (updatedFiles.length === 0) {
            setViewModalVisible(false)
          }

          // 刷新企业数据
          fetchCompany()
        } catch (error) {
          console.error('删除文件失败:', error)
          message.error(t('messages.deleteError'))
        }
      }
    })
  }

  // 上传PDF
  const handleUpload = (field: string) => {
    setCurrentUploadField(field)
    setFileList([])
    setUploadModalVisible(true)
  }

  // 处理文件上传
  const handleUploadRequest = async (options: any) => {
    const { file, onSuccess, onError } = options

    setActiveUploads(prev => prev + 1)

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
      setFileList(prev => {
        const newFile = {
          uid: file.uid,
          name: file.name,
          status: 'done',
          url: getFileUrl(url),
          response: { url }
        } as UploadFile
        return [...prev, newFile]
      })

      onSuccess({ url })
      message.success(`${file.name} ${t('messages.uploadSuccess')}`)
    } catch (error) {
      console.error('上传失败:', error)
      onError(error)
      message.error(`${file.name} ${t('messages.uploadError')}`)
    } finally {
      setActiveUploads(prev => prev - 1)
    }
  }

  // 处理文件移除
  const handleRemove = (file: UploadFile) => {
    setFileList(prev => prev.filter(f => f.uid !== file.uid))
  }

  // 确认上传
  const handleUploadConfirm = async () => {
    setUploading(true)
    if (fileList.length === 0 || !company || !currentUploadField) {
      message.warning(t('messages.selectFileWarning'))
      setUploading(false)
      return
    }

    try {
      // 获取已上传文件的URL列表
      const newFiles: DocumentFile[] = fileList
        .filter(file => file.status === 'done' && file.url)
        .map(file => ({
          url: file.url as string,
          uploadedAt: new Date().toISOString()
        }))

      if (newFiles.length === 0) {
        message.warning(t('messages.noUploadedFileWarning'))
        return
      }

      // 获取当前字段的现有文件列表
      const currentFiles = (company[currentUploadField as keyof CompanyDetail] as DocumentFile[]) || []

      // 合并新旧文件列表
      const updatedFiles = [...currentFiles, ...newFiles]

      // 更新数据库
      const { error } = await supabase
        .from('companies')
        .update({ [currentUploadField]: updatedFiles })
        .eq('id', company.id)

      if (error) throw error
      message.success(t('messages.uploadComplete'))
      setUploadModalVisible(false)
      setFileList([])
      fetchCompany()
    } catch (error) {
      console.error('保存文件URL失败:', error)
      message.error(t('messages.saveError'))
    } finally {
      setUploading(false)
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

      <Card
        title={t('detail.title')}
        extra={
          !isReadOnly && (
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => setEditModalVisible(true)}
            >
              {t('actions.edit')}
            </Button>
          )
        }
      >
        {company && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label={t('form.name')}>{company.name}</Descriptions.Item>
            <Descriptions.Item label={t('form.legalNumber')}>{company.legal_number}</Descriptions.Item>
            <Descriptions.Item label={t('form.representative')}>{company.representative}</Descriptions.Item>
            <Descriptions.Item label={t('form.industry')}>{company.industry}</Descriptions.Item>
            <Descriptions.Item label={t('columns.isAssociationMember')}>{company.is_association_member ? '是' : '否'}</Descriptions.Item>
            <Descriptions.Item label={t('form.employeeCount')}>{company.employee_count}人</Descriptions.Item>
            <Descriptions.Item label={t('form.registeredCapital')}>{company.registered_capital}</Descriptions.Item>
            <Descriptions.Item label={t('form.address')} span={2}>{company.address}</Descriptions.Item>
            <Descriptions.Item label={t('form.internAddress')} span={2}>{company.intern_address}</Descriptions.Item>
            <Descriptions.Item label={t('form.contact')}>{company.contact}</Descriptions.Item>
            <Descriptions.Item label={t('form.email')}>{company.email}</Descriptions.Item>
          </Descriptions>
        )}

        {/* 工单信息 - 所有用户可见 */}
        <div style={{ marginTop: 24 }}>
          <h3 style={{ marginBottom: 16 }}>{t('detail.workOrderInfo')}</h3>
          {workOrders.length > 0 ? (
            <Row gutter={[16, 16]}>
              {workOrders.map((workOrder) => (
                <Col xs={24} sm={12} md={8} key={workOrder.id}>
                  <Card
                    size="small"
                    title={workOrder.name}
                    hoverable
                    onClick={() => router.push(`/work-orders/${workOrder.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <Descriptions column={1} size="small">
                      <Descriptions.Item label={tWorkOrder('form.position')}>{workOrder.position || '-'}</Descriptions.Item>
                      <Descriptions.Item label={tWorkOrder('form.recruitCount')}>{workOrder.recruit_count ? `${workOrder.recruit_count}人` : '-'}</Descriptions.Item>
                      <Descriptions.Item label={tWorkOrder('form.salary')}>{workOrder.salary || '-'}</Descriptions.Item>
                      <Descriptions.Item label={tWorkOrder('form.workTime')}>{workOrder.work_time || '-'}</Descriptions.Item>
                      <Descriptions.Item label={tWorkOrder('form.restDays')}>{workOrder.rest_days || '-'}</Descriptions.Item>
                      <Descriptions.Item label={tWorkOrder('form.benefits')}>{workOrder.benefits || '-'}</Descriptions.Item>
                    </Descriptions>
                  </Card>
                </Col>
              ))}
            </Row>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
              {t('detail.noWorkOrder')}
            </div>
          )}
        </div>

        {/* 企业文档 - 仅日方员工/管理员可见和操作 */}
        {!isReadOnly && (
          <div style={{ marginTop: 24 }}>
            <h3 style={{ marginBottom: 16 }}>{t('form.documents')}</h3>
            <Row gutter={[16, 16]}>
              {documentFields.map((field) => {
                const files = company?.[field.key as keyof CompanyDetail] as DocumentFile[] | undefined
                const fileCount = files?.length || 0
                return (
                  <Col xs={24} sm={12} md={8} key={field.key}>
                    <Card size="small">
                      <div style={{ marginBottom: 8, fontWeight: 500 }}>{field.label}</div>

                      {field.key === 'association_application_form' ? (
                        <Space>
                          {company?.first_training_at ? (
                            <Button
                              size="small"
                              icon={<FilePdfOutlined />}
                              onClick={async () => {
                                if (!company) return
                                try {
                                  message.loading('正在生成文件...')
                                  // Cast because CompanyDetail might miss fields, checking type safety
                                  const pdfBytes = await generateUnionJoinApplication(company as any)
                                  const blob = new Blob([pdfBytes as any], { type: 'application/pdf' })
                                  saveAs(blob, `${company.name}_入会申请书.pdf`)
                                  message.success('下载成功')
                                } catch (e) {
                                  console.error(e)
                                  message.error('生成失败: ' + (e as Error).message)
                                }
                              }}
                            >
                              下载申请书
                            </Button>
                          ) : (
                            <span style={{ color: '#ccc' }}>暂无数据</span>
                          )}
                        </Space>
                      ) : (
                        <Space>
                          <Button
                            size="small"
                            icon={<UploadOutlined />}
                            onClick={() => handleUpload(field.key)}
                          >
                            {t('actions.upload')}
                          </Button>
                          {fileCount > 0 && (
                            <Button
                              size="small"
                              icon={<EyeOutlined />}
                              onClick={() => handleViewPdfs(files, field.key)}
                            >
                              {t('actions.view')} ({fileCount})
                            </Button>
                          )}
                        </Space>
                      )}
                    </Card>
                  </Col>

                )
              })}
            </Row>
          </div >
        )
        }
      </Card >

      {/* 编辑Modal */}
      < Modal
        title={t('detail.editTitle')}
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        footer={null}
        width={800}
      >
        <EditCompanyForm
          company={company}
          onSuccess={() => {
            setEditModalVisible(false)
            fetchCompany()
            message.success(t('messages.updateSuccess'))
          }}
          onCancel={() => setEditModalVisible(false)}
          t={t}
        />
      </Modal >

      {/* 上传PDF Modal */}
      < Modal
        title={`${t('upload.title')}${documentFields.find(f => f.key === currentUploadField)?.label || '文件'}`}
        open={uploadModalVisible}
        onCancel={() => {
          setUploadModalVisible(false)
          setFileList([])
        }}
        onOk={handleUploadConfirm}
        okText={t('upload.confirm')}
        cancelText={t('upload.cancel')}
        width={600}
        confirmLoading={uploading}
        okButtonProps={{ disabled: activeUploads > 0 }}
      >
        <Upload
          accept=".pdf,.jpg,.jpeg,.png"
          multiple
          fileList={fileList}
          customRequest={handleUploadRequest}
          onRemove={handleRemove}
          beforeUpload={(file) => {
            const isLt4_5M = file.size / 1024 / 1024 < 4.5;
            if (!isLt4_5M) {
              message.error(t('upload.fileSizeLimit'));
              return false;
            }
            return true;
          }}
        >
          <Button icon={<UploadOutlined />} loading={activeUploads > 0}>{t('upload.selectFiles')}</Button>
        </Upload >
        <div style={{ marginTop: 16, color: '#666', fontSize: '12px' }}>
          {t('upload.hint')}
        </div>
        {
          fileList.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ marginBottom: 8, fontWeight: 500 }}>{t('upload.selected')}</div>
              <List
                size="small"
                dataSource={fileList}
                renderItem={(file) => (
                  <List.Item>
                    <Space>
                      <FilePdfOutlined />
                      <span>{file.name}</span>
                      <span style={{ color: '#999', fontSize: '12px' }}>
                        {(file.size! / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </Space>
                  </List.Item>
                )}
              />
            </div>
          )
        }

      </Modal >

      {/* 查看文件 Modal */}
      < Modal
        title={`查看${documentFields.find(f => f.key === currentViewField)?.label || '文件'}`}
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={
          [
            <Button key="close" onClick={() => setViewModalVisible(false)}>
              关闭
            </Button>
          ]}
        width={600}
      >
        <List
          dataSource={currentViewFiles}
          renderItem={(file, index) => (
            <List.Item
              actions={[
                <Button
                  key="view"
                  type="link"
                  icon={<EyeOutlined />}
                  onClick={() => window.open(getFileUrl(file.url), '_blank')}
                >
                  查看
                </Button>,
                !isReadOnly && (
                  <Button
                    key="delete"
                    type="link"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDeleteFile(file.url, currentViewField)}
                  >
                    删除
                  </Button>
                )
              ].filter(Boolean)}
            >
              <List.Item.Meta
                avatar={<FilePdfOutlined style={{ fontSize: '24px', color: '#ff4d4f' }} />}
                title={
                  <Space direction="vertical" size={0}>
                    <span>{file.url.split('/').pop()}</span>
                    <span style={{ fontSize: '12px', color: '#999' }}>
                      {t('uploadTime')}: {file.uploadedAt ? new Date(file.uploadedAt).toLocaleString(locale) : '-'}
                    </span>
                  </Space>
                }
                description={<div style={{ wordBreak: 'break-all', fontSize: '12px' }}>{file.url.split('/').pop()}</div>}
              />
            </List.Item>
          )}
        />
      </Modal >
    </div >
  )
}

