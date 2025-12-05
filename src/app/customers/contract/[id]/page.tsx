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
  DatePicker
} from 'antd'
import type { UploadFile } from 'antd'
import {
  EditOutlined,
  ArrowLeftOutlined,
  UploadOutlined,
  FilePdfOutlined,
  DeleteOutlined
} from '@ant-design/icons'
import { supabase } from '@/lib/supabase'
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
  resume?: string[] // 原始简历
  passport?: string[] // 护照
  household_book?: string[] // 户口本
  id_card?: string[] // 身份证
  photo_2inch?: string[] // 2寸照片
  credit_report?: string[] // 征信报告
  no_crime_cert?: string[] // 无犯罪证明
  national_cert?: string[] // 国检证书
  provincial_cert?: string[] // 省级考试证书
  employment_contract?: string[] // 雇佣合同
  japan_agency_contract?: string[] // 赴日中介合同
  immigration_materials?: string[] // 入管局资料
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
  const [form] = Form.useForm()

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
        message.error('获取客户详情失败')
      } finally {
        setLoading(false)
      }
    }

    if (customerId) {
      fetchCustomer()
    }
  }, [customerId, form])

  // 查看多个PDF
  const handleViewPdfs = (urls?: string[]) => {
    if (!urls || urls.length === 0) {
      message.warning('暂无文件')
      return
    }
    urls.forEach(url => {
      window.open(getFileUrl(url), '_blank')
    })
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

    try {
      const currentFiles = (customer[field as keyof CustomerDetail] as string[]) || []
      const newFiles = currentFiles.filter(url => url !== fileUrl)

      const { error } = await supabase
        .from('customers')
        .update({ [field]: newFiles })
        .eq('id', customer.id)

      if (error) throw error
      message.success('删除成功')
      setCustomer({ ...customer, [field]: newFiles } as CustomerDetail)
    } catch {
      message.error('删除失败')
    }
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
      message.success(`${file.name} 上传成功`)
    } catch (error) {
      console.error('上传失败:', error)
      onError(error)
      message.error(`${file.name} 上传失败`)
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
      message.warning('请至少选择一个文件')
      return
    }

    try {
      // 获取已上传文件的URL列表
      const uploadedUrls = fileList
        .filter(file => file.status === 'done' && file.url)
        .map(file => file.url as string)

      if (uploadedUrls.length === 0) {
        message.warning('没有成功上传的文件')
        return
      }

      // 获取当前字段的现有文件列表
      const currentFiles = (customer[currentUploadField as keyof CustomerDetail] as string[]) || []

      // 合并新旧文件列表
      const updatedFiles = [...currentFiles, ...uploadedUrls]

      // 更新数据库
      const { error } = await supabase
        .from('customers')
        .update({ [currentUploadField]: updatedFiles })
        .eq('id', customer.id)

      if (error) throw error
      message.success('上传完成')
      setUploadModalVisible(false)
      setFileList([])
      setCustomer({ ...customer, [currentUploadField]: updatedFiles } as CustomerDetail)
    } catch (error) {
      console.error('保存文件URL失败:', error)
      message.error('保存失败')
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
      message.success('更新成功')
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
      message.error('更新失败')
    }
  }

  const documentFields = [
    { key: 'resume', label: '原始简历' },
    { key: 'passport', label: '护照' },
    { key: 'household_book', label: '户口本' },
    { key: 'id_card', label: '身份证' },
    { key: 'photo_2inch', label: '2寸照片' },
    { key: 'credit_report', label: '征信报告' },
    { key: 'no_crime_cert', label: '无犯罪证明' },
    { key: 'national_cert', label: '国检证书' },
    { key: 'provincial_cert', label: '省级考试证书' },
    { key: 'employment_contract', label: '雇佣合同' },
    { key: 'japan_agency_contract', label: '赴日中介合同' },
    { key: 'immigration_materials', label: '入管局资料' },
  ]

  if (loading) {
    return <div>加载中...</div>
  }

  if (!customer) {
    return <div>客户不存在</div>
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

      <Card
        title="客户详情"
        extra={
          !isEditing ? (
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={handleEdit}
            >
              编辑
            </Button>
          ) : (
            <Space>
              <Button onClick={handleCancelEdit}>
                取消
              </Button>
              <Button
                type="primary"
                onClick={() => form.submit()}
              >
                保存
              </Button>
            </Space>
          )
        }
      >
        {!isEditing ? (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="姓名">{customer.real_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="性别">
              {customer.gender === 'male' ? '男' : customer.gender === 'female' ? '女' : customer.gender || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="出生年月日">{customer.birth_date || '-'}</Descriptions.Item>
            <Descriptions.Item label="户籍所在地">{customer.household_location || '-'}</Descriptions.Item>
            <Descriptions.Item label="现居住地">{customer.current_residence || '-'}</Descriptions.Item>
            <Descriptions.Item label="联系方式">{customer.contact || '-'}</Descriptions.Item>
            <Descriptions.Item label="实名微信号">{customer.wechat || '-'}</Descriptions.Item>
            <Descriptions.Item label="紧急联系人">{customer.emergency_contact || '-'}</Descriptions.Item>
            <Descriptions.Item label="紧急联系人电话" span={2}>{customer.emergency_phone || '-'}</Descriptions.Item>
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
                  label="姓名"
                  rules={[{ required: true, message: '请输入姓名' }]}
                >
                  <Input placeholder="请输入姓名" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="gender"
                  label="性别"
                >
                  <Select placeholder="请选择性别">
                    <Select.Option value="male">男</Select.Option>
                    <Select.Option value="female">女</Select.Option>
                    <Select.Option value="other">其他</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="birth_date"
                  label="出生年月日"
                >
                  <DatePicker
                    style={{ width: '100%' }}
                    placeholder="请选择出生年月日"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="household_location"
                  label="户籍所在地"
                >
                  <Input placeholder="请输入户籍所在地" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="current_residence"
                  label="现居住地"
                >
                  <Input placeholder="请输入现居住地" />
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
                  name="wechat"
                  label="实名微信号"
                >
                  <Input placeholder="请输入实名微信号" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="emergency_contact"
                  label="紧急联系人"
                >
                  <Input placeholder="请输入紧急联系人" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="emergency_phone"
                  label="紧急联系人电话"
                >
                  <Input placeholder="请输入紧急联系人电话" />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        )}

        <div style={{ marginTop: 24 }}>
          <h3 style={{ marginBottom: 16 }}>文档资料</h3>
          <Row gutter={[16, 16]}>
            {documentFields.map((field) => {
              const urls = customer[field.key as keyof CustomerDetail] as string[] | undefined
              const fileCount = urls?.length || 0
              return (
                <Col xs={24} sm={12} md={8} key={field.key}>
                  <Card size="small">
                    <div style={{ marginBottom: 8, fontWeight: 500 }}>{field.label}</div>
                    {fileCount > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        {urls!.map((url, index) => (
                          <div key={index} style={{ marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Space>
                              <FilePdfOutlined />
                              <span style={{ fontSize: '12px' }}>{url.split('/').pop()}</span>
                            </Space>
                            <Space>
                              <Button
                                type="link"
                                size="small"
                                onClick={() => window.open(getFileUrl(url), '_blank')}
                              >
                                查看
                              </Button>
                              <Button
                                type="link"
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => handleDeleteFile(field.key, url)}
                              >
                                删除
                              </Button>
                            </Space>
                          </div>
                        ))}
                      </div>
                    )}
                    <Button
                      size="small"
                      icon={<UploadOutlined />}
                      onClick={() => handleUpload(field.key)}
                      style={{ width: '100%' }}
                    >
                      上传
                    </Button>
                  </Card>
                </Col>
              )
            })}
          </Row>
        </div>
      </Card>

      {/* 上传PDF Modal */}
      <Modal
        title={`上传${documentFields.find(f => f.key === currentUploadField)?.label || '文件'}`}
        open={uploadModalVisible}
        onCancel={() => {
          setUploadModalVisible(false)
          setFileList([])
        }}
        onOk={handleUploadConfirm}
        okText="确认上传"
        cancelText="取消"
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
            {uploading ? '上传中...' : '选择文件（可多选）'}
          </Button>
        </Upload>
        <div style={{ marginTop: 16, color: '#666', fontSize: '12px' }}>
          支持一次选择多个PDF文件上传
        </div>
      </Modal>
    </div>
  )
}

