'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
  List
} from 'antd'
import type { UploadFile } from 'antd'
import {
  EditOutlined,
  ArrowLeftOutlined,
  UploadOutlined,
  FilePdfOutlined,
  EyeOutlined
} from '@ant-design/icons'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { getFileUrl } from '@/lib/utils'

interface CompanyDetail {
  id: string
  name: string // 会社名称
  legal_number: string // 法人番号
  representative: string // 代表取缔役
  industry: string // 所属行业
  employee_count: number // 公司从业人数
  registered_capital: string // 注册资本金
  address: string // 公司地址
  contact: string // 联系方式
  email: string // 联系邮箱
  teihon?: string[] // 藤本 (多文件)
  financial_report?: string[] // 决算报告书 (多文件)
  industry_license?: string[] // 行业许可证 (多文件)
  gmo_contract?: string[] // GMO合同 (多文件)
  otit_materials?: string[] // OTIT资料 (多文件)
  central_materials?: string[] // 中央会资料 (多文件)
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
  const [currentViewFiles, setCurrentViewFiles] = useState<string[]>([])
  const [currentViewField, setCurrentViewField] = useState<string>('')

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
      message.error('获取企业详情失败')
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
  const handleViewPdfs = (urls: string[] | undefined, field: string) => {
    if (!urls || urls.length === 0) {
      message.warning('暂无文件')
      return
    }
    setCurrentViewFiles(urls)
    setCurrentViewField(field)
    setViewModalVisible(true)
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
      message.success(`${file.name} 上传成功`)
    } catch (error) {
      console.error('上传失败:', error)
      onError(error)
      message.error(`${file.name} 上传失败`)
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
      message.warning('请至少选择一个文件')
      setUploading(false)
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
      const currentFiles = (company[currentUploadField as keyof CompanyDetail] as string[]) || []

      // 合并新旧文件列表
      const updatedFiles = [...currentFiles, ...uploadedUrls]

      // 更新数据库
      const { error } = await supabase
        .from('companies')
        .update({ [currentUploadField]: updatedFiles })
        .eq('id', company.id)

      if (error) throw error
      message.success('上传完成')
      setUploadModalVisible(false)
      setFileList([])
      fetchCompany()
    } catch (error) {
      console.error('保存文件URL失败:', error)
      message.error('保存失败')
    } finally {
      setUploading(false)
    }
  }

  // 删除文件
  const handleDeleteFile = async (field: string, urlToDelete: string) => {
    if (!company) return

    try {
      const currentFiles = (company[field as keyof CompanyDetail] as string[]) || []
      const updatedFiles = currentFiles.filter(url => url !== urlToDelete)

      const { error } = await supabase
        .from('companies')
        .update({ [field]: updatedFiles })
        .eq('id', company.id)

      if (error) throw error
      message.success('删除成功')
      fetchCompany()
    } catch (error) {
      console.error('删除文件失败:', error)
      message.error('删除失败')
    }
  }

  const documentFields = [
    { key: 'teihon', label: '藤本' },
    { key: 'financial_report', label: '决算报告书' },
    { key: 'industry_license', label: '行业许可证' },
    { key: 'gmo_contract', label: 'GMO合同' },
    { key: 'otit_materials', label: 'OTIT资料' },
    { key: 'central_materials', label: '中央会资料' },
  ]

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
        title="企业详情"
        extra={
          !isReadOnly && (
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => setEditModalVisible(true)}
            >
              编辑
            </Button>
          )
        }
      >
        {company && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="会社名称">{company.name}</Descriptions.Item>
            <Descriptions.Item label="法人番号">{company.legal_number}</Descriptions.Item>
            <Descriptions.Item label="代表取缔役">{company.representative}</Descriptions.Item>
            <Descriptions.Item label="所属行业">{company.industry}</Descriptions.Item>
            <Descriptions.Item label="公司从业人数">{company.employee_count}人</Descriptions.Item>
            <Descriptions.Item label="注册资本金">{company.registered_capital}</Descriptions.Item>
            <Descriptions.Item label="公司地址" span={2}>{company.address}</Descriptions.Item>
            <Descriptions.Item label="联系方式">{company.contact}</Descriptions.Item>
            <Descriptions.Item label="联系邮箱">{company.email}</Descriptions.Item>
          </Descriptions>
        )}

        {/* 工单信息 - 所有用户可见 */}
        <div style={{ marginTop: 24 }}>
          <h3 style={{ marginBottom: 16 }}>工单信息</h3>
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
                      <Descriptions.Item label="岗位名称">{workOrder.position || '-'}</Descriptions.Item>
                      <Descriptions.Item label="招聘人数">{workOrder.recruit_count ? `${workOrder.recruit_count}人` : '-'}</Descriptions.Item>
                      <Descriptions.Item label="薪资">{workOrder.salary || '-'}</Descriptions.Item>
                      <Descriptions.Item label="工作时间">{workOrder.work_time || '-'}</Descriptions.Item>
                      <Descriptions.Item label="休息天数">{workOrder.rest_days || '-'}</Descriptions.Item>
                      <Descriptions.Item label="工作待遇">{workOrder.benefits || '-'}</Descriptions.Item>
                    </Descriptions>
                  </Card>
                </Col>
              ))}
            </Row>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
              暂无工单信息
            </div>
          )}
        </div>

        {/* 企业文档 - 仅日方员工/管理员可见和操作 */}
        {!isReadOnly && (
          <div style={{ marginTop: 24 }}>
            <h3 style={{ marginBottom: 16 }}>企业文档</h3>
            <Row gutter={[16, 16]}>
              {documentFields.map((field) => {
                const urls = company?.[field.key as keyof CompanyDetail] as string[] | undefined
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
                          上传
                        </Button>
                        <Button
                          size="small"
                          icon={<FilePdfOutlined />}
                          onClick={() => handleViewPdfs(urls, field.key)}
                          disabled={fileCount === 0}
                        >
                          查看{fileCount > 0 ? `(${fileCount})` : ''}
                        </Button>
                      </Space>
                    </Card>
                  </Col>
                )
              })}
            </Row>
          </div>
        )}
      </Card>

      {/* 编辑Modal */}
      <Modal
        title="编辑企业信息"
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        footer={null}
        width={600}
      >
        {/* TODO: 添加编辑表单 */}
        <p>编辑表单待实现</p>
      </Modal>

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
        okButtonProps={{ disabled: activeUploads > 0 }}
      >
        <Upload
          accept=".pdf,.jpg,.jpeg,.png"
          multiple
          fileList={fileList}
          customRequest={handleUploadRequest}
          onRemove={handleRemove}
        >
          <Button icon={<UploadOutlined />} loading={activeUploads > 0}>选择文件（可多选）</Button>
        </Upload>
        <div style={{ marginTop: 16, color: '#666', fontSize: '12px' }}>
          支持一次选择多个PDF文件上传
        </div>
        {fileList.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>已选择文件：</div>
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
        )}

      </Modal>

      {/* 查看文件 Modal */}
      <Modal
        title={`查看${currentViewField === 'teihon' ? '藤本' :
          currentViewField === 'financial_report' ? '决算报告书' :
            currentViewField === 'industry_license' ? '行业许可证' :
              currentViewField === 'gmo_contract' ? 'GMO合同' :
                currentViewField === 'otit_materials' ? 'OTIT资料' :
                  currentViewField === 'central_materials' ? '中央会资料' : '文件'}`}
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={600}
      >
        <List
          dataSource={currentViewFiles}
          renderItem={(url, index) => (
            <List.Item
              actions={[
                <Button
                  type="link"
                  icon={<EyeOutlined />}
                  onClick={() => window.open(getFileUrl(url), '_blank')}
                >
                  查看
                </Button>
              ]}
            >
              <List.Item.Meta
                avatar={<FilePdfOutlined style={{ fontSize: '24px', color: '#ff4d4f' }} />}
                title={`文件 ${index + 1}`}
                description={<div style={{ wordBreak: 'break-all', fontSize: '12px' }}>{url.split('/').pop()}</div>}
              />
            </List.Item>
          )}
        />
      </Modal>
    </div >
  )
}

