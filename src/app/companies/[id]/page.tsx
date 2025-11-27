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
  FilePdfOutlined
} from '@ant-design/icons'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

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
  const [loading, setLoading] = useState(false)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [uploadModalVisible, setUploadModalVisible] = useState(false)
  const [currentUploadField, setCurrentUploadField] = useState<string>('')
  const [fileList, setFileList] = useState<UploadFile[]>([])

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

  useEffect(() => {
    if (companyId) {
      fetchCompany()
    }
  }, [companyId])

  // 查看多个PDF
  const handleViewPdfs = (urls?: string[]) => {
    if (!urls || urls.length === 0) {
      message.warning('暂无文件')
      return
    }
    urls.forEach(url => {
      window.open(url, '_blank')
    })
  }

  // 上传PDF
  const handleUpload = (field: string) => {
    setCurrentUploadField(field)
    setFileList([])
    setUploadModalVisible(true)
  }

  // 处理文件上传
  const handleUploadChange = (info: any) => {
    let newFileList = [...info.fileList]
    
    // 限制文件数量，只显示最近上传的文件
    newFileList = newFileList.slice(-10)
    
    // 读取响应并显示文件链接
    newFileList = newFileList.map((file) => {
      if (file.response) {
        file.url = file.response.url
      }
      return file
    })
    
    setFileList(newFileList)
    
    if (info.file.status === 'done') {
      message.success(`${info.file.name} 上传成功`)
    } else if (info.file.status === 'error') {
      message.error(`${info.file.name} 上传失败`)
    }
  }

  // 确认上传
  const handleUploadConfirm = async () => {
    if (fileList.length === 0 || !company || !currentUploadField) {
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
          <Button 
            type="primary" 
            icon={<EditOutlined />}
            onClick={() => setEditModalVisible(true)}
          >
            编辑
          </Button>
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
                        onClick={() => handleViewPdfs(urls)}
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
      >
        <Upload
          accept=".pdf"
          multiple
          fileList={fileList}
          onChange={handleUploadChange}
          beforeUpload={(file) => {
            // TODO: 实际上传文件到服务器
            // 这里先模拟上传成功
            setTimeout(() => {
              message.success(`${file.name} 上传成功`)
            }, 1000)
            return false // 阻止自动上传，手动处理
          }}
        >
          <Button icon={<UploadOutlined />}>选择PDF文件（可多选）</Button>
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
    </div>
  )
}

