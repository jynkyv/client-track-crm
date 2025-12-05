'use client'

import { useState, useEffect } from 'react'
import {
  Table,
  Button,
  Form,
  Input,
  Select,
  Space,
  Card,
  Upload,
  Modal,
  message,
  List
} from 'antd'
import type { UploadFile } from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  EyeOutlined,
  UploadOutlined,
  FilePdfOutlined,
  ReloadOutlined
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useRouter } from '@/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { getFileUrl } from '@/lib/utils'
import { useTranslations } from 'next-intl'

const { Option } = Select

interface Company {
  id: string
  name: string
  industry: string
  teihon?: string[] // 藤本 PDF URLs (多文件)
  financial_report?: string[] // 决算报告书 PDF URLs (多文件)
  industry_license?: string[] // 行业许可证 PDF URLs (多文件)
  gmo_contract?: string[] // GMO合同 PDF URLs (多文件)
  otit_materials?: string[] // OTIT资料 PDF URLs (多文件)
  central_materials?: string[] // 中央会资料 PDF URLs (多文件)
}

export default function CompaniesPage() {
  const router = useRouter()
  const { canAccessCompanies } = useAuth()
  const [searchForm] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [companies, setCompanies] = useState<Company[]>([])
  const [uploadModalVisible, setUploadModalVisible] = useState(false)
  const [currentUploadField, setCurrentUploadField] = useState<string>('')
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null)
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const t = useTranslations('Company')
  const tCommon = useTranslations('Common')

  // 搜索状态
  const [searchName, setSearchName] = useState('')
  const [searchIndustry, setSearchIndustry] = useState('')

  // 获取企业列表
  const fetchCompanies = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false })

      // 应用搜索条件
      if (searchName) {
        query = query.ilike('name', `%${searchName}%`)
      }
      if (searchIndustry) {
        query = query.ilike('industry', `%${searchIndustry}%`)
      }

      const { data, error } = await query

      if (error) throw error
      setCompanies(data || [])
    } catch (error) {
      console.error('获取企业列表失败:', error)
      message.error(t('messages.fetchError'))
    } finally {
      setLoading(false)
    }
  }

  // 初始化数据
  useEffect(() => {
    fetchCompanies()
  }, [searchName, searchIndustry])

  // 重置搜索
  const handleResetSearch = () => {
    setSearchName('')
    setSearchIndustry('')
    searchForm.resetFields()
  }

  // 创建企业
  const handleCreate = () => {
    router.push('/companies/create')
  }


  // 上传PDF
  const handleUpload = (field: string, company: Company) => {
    setCurrentUploadField(field)
    setCurrentCompany(company)
    setFileList([])
    setUploadModalVisible(true)
  }

  // 处理文件上传
  const handleUploadRequest = async (options: any) => {
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
    }
  }

  // 处理文件移除
  const handleRemove = (file: UploadFile) => {
    setFileList(prev => prev.filter(f => f.uid !== file.uid))
  }

  // 确认上传
  const handleUploadConfirm = async () => {
    if (fileList.length === 0 || !currentCompany || !currentUploadField) {
      message.warning(t('messages.selectFileWarning'))
      return
    }

    try {
      // 获取已上传文件的URL列表
      const uploadedUrls = fileList
        .filter(file => file.status === 'done' && file.url)
        .map(file => file.url as string)

      if (uploadedUrls.length === 0) {
        message.warning(t('messages.noUploadedFileWarning'))
        return
      }

      // 获取当前字段的现有文件列表
      const currentFiles = (currentCompany[currentUploadField as keyof Company] as string[]) || []

      // 合并新旧文件列表
      const updatedFiles = [...currentFiles, ...uploadedUrls]

      // 更新数据库
      const { error } = await supabase
        .from('companies')
        .update({ [currentUploadField]: updatedFiles })
        .eq('id', currentCompany.id)

      if (error) throw error
      message.success(t('messages.uploadComplete'))
      setUploadModalVisible(false)
      setFileList([])
      fetchCompanies()
    } catch (error) {
      console.error('保存文件URL失败:', error)
      message.error(t('messages.saveError'))
    }
  }

  // 查看多个PDF
  const handleViewPdfs = (urls?: string[]) => {
    if (!urls || urls.length === 0) {
      message.warning(t('messages.noFileWarning'))
      return
    }
    urls.forEach(url => {
      window.open(getFileUrl(url), '_blank')
    })
  }

  // PDF操作列渲染
  const renderPdfColumn = (field: string, record: Company) => {
    const urls = record[field as keyof Company] as string[] | undefined
    const fileCount = urls?.length || 0
    return (
      <Space>
        <Button
          size="small"
          icon={<UploadOutlined />}
          onClick={() => handleUpload(field, record)}
        >
          {t('actions.upload')}
        </Button>
        <Button
          size="small"
          icon={<FilePdfOutlined />}
          onClick={() => handleViewPdfs(urls)}
          disabled={fileCount === 0}
        >
          {t('actions.view')}{fileCount > 0 ? `(${fileCount})` : ''}
        </Button>
      </Space>
    )
  }

  const columns = [
    {
      title: t('columns.name'),
      dataIndex: 'name',
      key: 'name',
      width: 150,
      align: 'center' as const,
    },
    {
      title: t('columns.industry'),
      dataIndex: 'industry',
      key: 'industry',
      width: 120,
      align: 'center' as const,
    },
    {
      title: t('columns.teihon'),
      key: 'teihon',
      width: 150,
      align: 'center' as const,
      render: (_: any, record: Company) => renderPdfColumn('teihon', record)
    },
    {
      title: t('columns.financialReport'),
      key: 'financial_report',
      width: 150,
      align: 'center' as const,
      render: (_: any, record: Company) => renderPdfColumn('financial_report', record)
    },
    {
      title: t('columns.industryLicense'),
      key: 'industry_license',
      width: 150,
      align: 'center' as const,
      render: (_: any, record: Company) => renderPdfColumn('industry_license', record)
    },
    {
      title: t('columns.gmoContract'),
      key: 'gmo_contract',
      width: 150,
      align: 'center' as const,
      render: (_: any, record: Company) => renderPdfColumn('gmo_contract', record)
    },
    {
      title: t('columns.otitMaterials'),
      key: 'otit_materials',
      width: 150,
      align: 'center' as const,
      render: (_: any, record: Company) => renderPdfColumn('otit_materials', record)
    },
    {
      title: t('columns.centralMaterials'),
      key: 'central_materials',
      width: 150,
      align: 'center' as const,
      render: (_: any, record: Company) => renderPdfColumn('central_materials', record)
    },
    {
      title: t('columns.actions'),
      key: 'action',
      width: 100,
      align: 'center' as const,
      render: (_: any, record: Company) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => router.push(`/companies/${record.id}`)}
        >
          {t('actions.viewDetail')}
        </Button>
      )
    }
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

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>{t('title')}</h2>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            {t('create')}
          </Button>
        </div>

        {/* 搜索区域 */}
        <Card style={{ marginBottom: 16 }}>
          <Form
            form={searchForm}
            layout="inline"
            style={{ width: '100%' }}
          >
            <Form.Item label={t('search.name')} style={{ marginBottom: 16 }}>
              <Input
                placeholder={t('search.namePlaceholder')}
                prefix={<SearchOutlined />}
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                allowClear
                style={{ width: 200 }}
              />
            </Form.Item>
            <Form.Item label={t('search.industry')} style={{ marginBottom: 16 }}>
              <Select
                placeholder={t('search.industryPlaceholder')}
                value={searchIndustry}
                onChange={setSearchIndustry}
                allowClear
                style={{ width: 200 }}
              >
                <Option value="制造业">制造业</Option>
                <Option value="服务业">服务业</Option>
                <Option value="IT">IT</Option>
                <Option value="金融">金融</Option>
                <Option value="其他">其他</Option>
              </Select>
            </Form.Item>
            <Form.Item style={{ marginBottom: 16 }}>
              <Button icon={<ReloadOutlined />} onClick={handleResetSearch}>
                {tCommon('reset')}
              </Button>
            </Form.Item>
          </Form>
        </Card>

        <Table
          columns={columns}
          dataSource={companies}
          loading={loading}
          rowKey="id"
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </Card>

      {/* 上传PDF Modal */}
      <Modal
        title={`${t('upload.title')}${currentUploadField === 'teihon' ? t('columns.teihon') :
          currentUploadField === 'financial_report' ? t('columns.financialReport') :
            currentUploadField === 'industry_license' ? t('columns.industryLicense') :
              currentUploadField === 'gmo_contract' ? t('columns.gmoContract') :
                currentUploadField === 'otit_materials' ? t('columns.otitMaterials') :
                  currentUploadField === 'central_materials' ? t('columns.centralMaterials') : '文件'}`}
        open={uploadModalVisible}
        onCancel={() => {
          setUploadModalVisible(false)
          setFileList([])
        }}
        onOk={handleUploadConfirm}
        okText={t('upload.confirm')}
        cancelText={t('upload.cancel')}
        width={600}
      >
        <Upload
          accept=".pdf,.jpg,.jpeg,.png"
          multiple
          fileList={fileList}
          customRequest={handleUploadRequest}
          onRemove={handleRemove}
        >
          <Button icon={<UploadOutlined />}>{t('upload.selectFiles')}</Button>
        </Upload>
        <div style={{ marginTop: 16, color: '#666', fontSize: '12px' }}>
          {t('upload.hint')}
        </div>
        {fileList.length > 0 && (
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
        )}
      </Modal>
    </div>
  )
}

