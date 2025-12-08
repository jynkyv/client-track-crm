'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
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
  Form,
  Input,
  Select,
  DatePicker,
  List
} from 'antd'
import type { UploadFile } from 'antd'
import {
  EditOutlined,
  ArrowLeftOutlined,
  UploadOutlined,
  FilePdfOutlined,
  DeleteOutlined
} from '@ant-design/icons'
import { supabase, type DocumentFile } from '@/lib/supabase'
import { useTranslations, useLocale } from 'next-intl'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import { getFileUrl } from '@/lib/utils'


interface CustomerDetail {
  id: string
  real_name: string // 姓名
  gender: string // 性别
  birth_date: string // 出生年月日
  household_location: string // 户籍所在地
  current_residence: string // 现居住地
  contact: string // 联系方式
  wechat?: string // 实名微信号
  emergency_contact?: string // 紧急联系人
  emergency_phone?: string // 紧急联系人电话
  resume?: DocumentFile[] // 原始简历
  passport?: DocumentFile[] // 护照
  household_book?: DocumentFile[] // 户口本
  id_card?: DocumentFile[] // 身份证
  photo_2inch?: DocumentFile[] // 2寸照片
  credit_report?: DocumentFile[] // 征信报告
  no_crime_cert?: DocumentFile[] // 无犯罪证明
  national_cert?: DocumentFile[] // 国检证书
  provincial_cert?: DocumentFile[] // 省级考试证书
  employment_contract?: DocumentFile[] // 雇佣合同
  japan_agency_contract?: DocumentFile[] // 赴日中介合同
  immigration_materials?: DocumentFile[] // 入管局资料
}

export default function CustomerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const customerId = params.id as string
  const [customer, setCustomer] = useState<CustomerDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [uploadModalVisible, setUploadModalVisible] = useState(false)
  const [currentUploadField, setCurrentUploadField] = useState<string>('')
  const [fileList, setFileList] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)

  // 查看文件模态框状态
  const [viewModalVisible, setViewModalVisible] = useState(false)
  const [currentViewFiles, setCurrentViewFiles] = useState<DocumentFile[]>([])
  const [currentViewField, setCurrentViewField] = useState<string>('')
  const [currentViewTitle, setCurrentViewTitle] = useState('')

  const [form] = Form.useForm()
  const t = useTranslations('contract')
  const tCommon = useTranslations('Common')
  const locale = useLocale()

  // 检查URL参数，如果包含edit=true，自动进入编辑模式
  useEffect(() => {
    const editParam = searchParams.get('edit')
    if (editParam === 'true') {
      setIsEditing(true)
      // 移除URL参数
      router.replace(`/customers/contract/${customerId}`)
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
        const customerData = data as any
        setCustomer(customerData)
        // 设置表单初始值
        form.setFieldsValue({
          real_name: customerData.real_name,
          gender: customerData.gender,
          birth_date: customerData.birth_date ? dayjs(customerData.birth_date) : null,
          household_location: customerData.household_location,
          current_residence: customerData.current_residence,
          contact: customerData.contact,
          wechat: customerData.wechat,
          emergency_contact: customerData.emergency_contact,
          emergency_phone: customerData.emergency_phone,
        })
      } catch (error) {
        message.error(t('messages.fetchDetailError'))
      } finally {
        setLoading(false)
      }
    }

    if (customerId) {
      fetchCustomer()
    }
  }, [customerId, form])

  // 查看多个PDF
  const handleViewPdfs = (files: DocumentFile[], field: string) => {
    if (!files || files.length === 0) {
      message.warning(t('messages.noFileWarning'))
      return
    }
    const fieldLabel = documentFields.find(f => f.key === field)?.label || ''
    setCurrentViewFiles(files)
    setCurrentViewField(field)
    setCurrentViewTitle(fieldLabel)
    setViewModalVisible(true)
  }

  // 上传PDF
  const handleUpload = (field: string) => {
    setCurrentUploadField(field)
    setFileList([])
    setUploadModalVisible(true)
  }

  // 删除文件
  const handleDeleteFile = async (field: string, fileUrl: string) => {
    if (!customer) return

    Modal.confirm({
      title: t('messages.confirmDeleteTitle'),
      content: t('messages.confirmDeleteContent'),
      okText: t('messages.confirmOk'),
      cancelText: t('messages.confirmCancel'),
      onOk: async () => {
        try {
          const currentFiles = (customer[field as keyof CustomerDetail] as DocumentFile[]) || []
          const newFiles = currentFiles.filter(f => f.url !== fileUrl)

          const { error } = await supabase
            .from('customers')
            .update({ [field]: newFiles })
            .eq('id', customer.id)

          if (error) throw error
          message.success(tCommon('success'))
          setCustomer({ ...customer, [field]: newFiles } as CustomerDetail)

          // 如果在查看模式下，同时也更新当前查看的文件列表
          if (viewModalVisible && currentViewField === field) {
            setCurrentViewFiles(newFiles)
            if (newFiles.length === 0) {
              setViewModalVisible(false)
            }
          }
        } catch {
          message.error(tCommon('error'))
        }
      }
    })
  }

  // 处理文件上传
  const handleUploadRequest = async (options: any) => {
    const { file, onSuccess, onError } = options

    setUploading(true)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(t('messages.uploadError'))
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
      setUploading(false)
    }
  }

  // 处理文件移除
  const handleRemove = (file: UploadFile) => {
    setFileList(prev => prev.filter(f => f.uid !== file.uid))
  }

  // 确认上传
  const handleUploadConfirm = async () => {
    if (fileList.length === 0 || !customer || !currentUploadField) {
      message.warning(t('messages.selectFileWarning'))
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
      const currentFiles = (customer[currentUploadField as keyof CustomerDetail] as DocumentFile[]) || []

      // 合并新旧文件列表
      const updatedFiles = [...currentFiles, ...newFiles]

      // 更新数据库
      const { error } = await supabase
        .from('customers')
        .update({ [currentUploadField]: updatedFiles })
        .eq('id', customer.id)

      if (error) throw error
      message.success(t('messages.uploadComplete'))
      setUploadModalVisible(false)
      setFileList([])
      setCustomer({ ...customer, [currentUploadField]: updatedFiles } as CustomerDetail)
    } catch (error) {
      console.error('保存文件URL失败:', error)
      message.error(t('messages.saveError'))
    } finally {
      setUploading(false)
    }
  }

  // 处理编辑
  const handleEdit = () => {
    setIsEditing(true)
  }

  // 取消编辑
  const handleCancelEdit = () => {
    setIsEditing(false)
    // 重置表单
    if (customer) {
      form.setFieldsValue({
        real_name: customer.real_name,
        gender: customer.gender,
        birth_date: customer.birth_date ? dayjs(customer.birth_date) : null,
        household_location: customer.household_location,
        current_residence: customer.current_residence,
        contact: customer.contact,
        wechat: customer.wechat,
        emergency_contact: customer.emergency_contact,
        emergency_phone: customer.emergency_phone,
      })
    }
  }

  // 提交编辑
  const handleSaveEdit = async (values: any) => {
    if (!customer) return

    try {
      const updateData: any = {
        real_name: values.real_name,
        gender: values.gender,
        birth_date: values.birth_date ? values.birth_date.format('YYYY-MM-DD') : null,
        household_location: values.household_location,
        current_residence: values.current_residence,
        contact: values.contact,
        wechat: values.wechat,
        emergency_contact: values.emergency_contact,
        emergency_phone: values.emergency_phone,
      }

      const { error } = await supabase
        .from('customers')
        .update(updateData)
        .eq('id', customer.id)

      if (error) throw error
      message.success(t('messages.updateSuccess'))
      setIsEditing(false)
      // 刷新数据
      const { data, error: fetchError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single()

      if (fetchError) throw fetchError
      const customerData = data as any
      setCustomer(customerData)
      // 更新表单值
      form.setFieldsValue({
        real_name: customerData.real_name,
        gender: customerData.gender,
        birth_date: customerData.birth_date ? dayjs(customerData.birth_date) : null,
        household_location: customerData.household_location,
        current_residence: customerData.current_residence,
        contact: customerData.contact,
        wechat: customerData.wechat,
        emergency_contact: customerData.emergency_contact,
        emergency_phone: customerData.emergency_phone,
      })
    } catch {
      message.error(t('messages.updateError'))
    }
  }

  const documentFields = [
    { key: 'resume', label: t('documents.resume') },
    { key: 'passport', label: t('documents.passport') },
    { key: 'household_book', label: t('documents.householdBook') },
    { key: 'id_card', label: t('documents.idCard') },
    { key: 'photo_2inch', label: t('documents.photo2inch') },
    { key: 'credit_report', label: t('documents.creditReport') },
    { key: 'no_crime_cert', label: t('documents.noCrimeCert') },
    { key: 'national_cert', label: t('documents.nationalCert') },
    { key: 'provincial_cert', label: t('documents.provincialCert') },
    { key: 'employment_contract', label: t('documents.employmentContract') },
    { key: 'japan_agency_contract', label: t('documents.japanAgencyContract') },
    { key: 'immigration_materials', label: t('documents.immigrationMaterials') },
  ]

  if (loading) {
    return <div>加载中...</div>
  }

  if (!customer) {
    return <div>{t('messages.customerNotFound')}</div>
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
          <Descriptions bordered column={2}>
            <Descriptions bordered column={2}>
              <Descriptions.Item label={t('form.realName')}>{customer.real_name || '-'}</Descriptions.Item>
              <Descriptions.Item label={t('form.gender')}>
                {customer.gender === 'male' ? tCommon('gender.male') : customer.gender === 'female' ? tCommon('gender.female') : customer.gender || '-'}
              </Descriptions.Item>
              <Descriptions.Item label={t('form.birthDate')}>{customer.birth_date || '-'}</Descriptions.Item>
              <Descriptions.Item label={t('form.householdLocation')}>{customer.household_location || '-'}</Descriptions.Item>
              <Descriptions.Item label={t('form.currentResidence')}>{customer.current_residence || '-'}</Descriptions.Item>
              <Descriptions.Item label={t('form.contact')}>{customer.contact || '-'}</Descriptions.Item>
              <Descriptions.Item label={t('form.wechat')}>{customer.wechat || '-'}</Descriptions.Item>
              <Descriptions.Item label={t('form.emergencyContact')}>{customer.emergency_contact || '-'}</Descriptions.Item>
              <Descriptions.Item label={t('form.emergencyPhone')} span={2}>{customer.emergency_phone || '-'}</Descriptions.Item>
            </Descriptions>
          </Descriptions>
        ) : (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSaveEdit}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="real_name"
                  label={t('form.realName')}
                  rules={[{ required: true, message: t('form.realNamePlaceholder') }]}
                >
                  <Input placeholder={t('form.realNamePlaceholder')} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="gender"
                  label={t('form.gender')}
                >
                  <Select placeholder={t('form.genderPlaceholder')}>
                    <Select.Option value="male">{tCommon('gender.male')}</Select.Option>
                    <Select.Option value="female">{tCommon('gender.female')}</Select.Option>
                    <Select.Option value="other">{tCommon('gender.other')}</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="birth_date"
                  label={t('form.birthDate')}
                >
                  <DatePicker
                    style={{ width: '100%' }}
                    placeholder={t('form.birthDatePlaceholder')}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="household_location"
                  label={t('form.householdLocation')}
                >
                  <Input placeholder={t('form.householdLocationPlaceholder')} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="current_residence"
                  label={t('form.currentResidence')}
                >
                  <Input placeholder={t('form.currentResidencePlaceholder')} />
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
                  name="wechat"
                  label={t('form.wechat')}
                >
                  <Input placeholder={t('form.wechatPlaceholder')} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="emergency_contact"
                  label={t('form.emergencyContact')}
                >
                  <Input placeholder={t('form.emergencyContactPlaceholder')} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="emergency_phone"
                  label={t('form.emergencyPhone')}
                >
                  <Input placeholder={t('form.emergencyPhonePlaceholder')} />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        )}

        <div style={{ marginTop: 24 }}>
          <h3 style={{ marginBottom: 16 }}>{t('detail.documents')}</h3>
          <Row gutter={[16, 16]}>
            {documentFields.map((field) => {
              const urls = customer[field.key as keyof CustomerDetail] as string[] | undefined
              const fileCount = urls?.length || 0
              return (
                <Col xs={24} sm={12} md={8} key={field.key}>
                  <Card size="small">
                    <div style={{ marginBottom: 8, fontWeight: 500 }}>{field.label}</div>
                    <Space>
                      <Button
                        size="small"
                        icon={<UploadOutlined />}
                        onClick={() => handleUpload(field.key)}
                      >
                        {t('actions.upload')}
                      </Button>
                      <Button
                        size="small"
                        icon={<FilePdfOutlined />}
                        onClick={() => handleViewPdfs(customer?.[field.key as keyof CustomerDetail] as DocumentFile[], field.key)}
                        disabled={!customer?.[field.key as keyof CustomerDetail] || (customer[field.key as keyof CustomerDetail] as DocumentFile[]).length === 0}
                      >
                        {t('actions.view')}
                        {customer?.[field.key as keyof CustomerDetail] && (customer[field.key as keyof CustomerDetail] as DocumentFile[]).length > 0 ?
                          `(${(customer[field.key as keyof CustomerDetail] as DocumentFile[]).length})` : ''}
                      </Button>
                    </Space>
                  </Card>
                </Col>
              )
            })}
          </Row>
        </div>
      </Card>

      {/* 查看文件 Modal */}
      <Modal
        title={`${t('detail.documents')} - ${currentViewTitle}`}
        open={viewModalVisible}
        onCancel={() => {
          setViewModalVisible(false)
          setCurrentViewFiles([])
          setCurrentViewTitle('')
        }}
        footer={[
          <Button key="close" onClick={() => {
            setViewModalVisible(false)
            setCurrentViewFiles([])
            setCurrentViewTitle('')
          }}>
            {tCommon('close')}
          </Button>
        ]}
        width={700}
      >
        <List
          dataSource={currentViewFiles}
          renderItem={(file, index) => (
            <List.Item
              actions={[
                <Button
                  type="link"
                  key="view"
                  onClick={() => window.open(getFileUrl(file.url), '_blank')}
                >
                  {t('actions.view')}
                </Button>,
                <Button
                  type="link"
                  danger
                  key="delete"
                  icon={<DeleteOutlined />}
                  onClick={() => handleDeleteFile(currentViewField, file.url)}
                >
                  {t('actions.delete')}
                </Button>
              ]}
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
              />
            </List.Item>
          )}
        />
      </Modal>

      {/* 上传PDF Modal */}
      <Modal
        title={`${t('upload.title')} - ${documentFields.find(f => f.key === currentUploadField)?.label || ''}`}
        open={uploadModalVisible}
        onCancel={() => {
          setUploadModalVisible(false)
          setFileList([])
        }}
        onOk={handleUploadConfirm}
        okText={t('upload.confirm')}
        cancelText={tCommon('cancel')}
        width={600}
        confirmLoading={uploading}
      >
        <Upload
          accept=".pdf,.jpg,.jpeg,.png"
          multiple
          fileList={fileList}
          customRequest={handleUploadRequest}
          onRemove={handleRemove}
        >
          <Button icon={<UploadOutlined />} loading={uploading}>
            {t('upload.selectFiles')}
          </Button>
        </Upload >
        <div style={{ marginTop: 16, color: '#666', fontSize: '12px' }}>
          {t('upload.hint')}
        </div>
      </Modal >
    </div >
  )
}

