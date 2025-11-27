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
  Dropdown,
  Upload,
  Modal,
  Drawer,
  message,
  List
} from 'antd'
import type { UploadFile } from 'antd'
import { 
  PlusOutlined, 
  SearchOutlined, 
  MoreOutlined, 
  EyeOutlined,
  UploadOutlined,
  FilePdfOutlined,
  ReloadOutlined
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useRouter } from 'next/navigation'

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
  const [form] = Form.useForm()
  const [searchForm] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [companies, setCompanies] = useState<Company[]>([])
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [uploadModalVisible, setUploadModalVisible] = useState(false)
  const [currentUploadField, setCurrentUploadField] = useState<string>('')
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null)
  const [fileList, setFileList] = useState<UploadFile[]>([])

  // 搜索状态
  const [searchName, setSearchName] = useState('')
  const [searchIndustry, setSearchIndustry] = useState('')

  // 模拟数据
  const mockCompanies: Company[] = [
    {
      id: '1',
      name: '示例企业A',
      industry: '制造业',
    },
    {
      id: '2',
      name: '示例企业B',
      industry: '服务业',
    },
  ]

  // 初始化数据
  useEffect(() => {
    setCompanies(mockCompanies)
  }, [])

  // 重置搜索
  const handleResetSearch = () => {
    setSearchName('')
    setSearchIndustry('')
    searchForm.resetFields()
  }

  // 创建企业
  const handleCreate = () => {
    form.resetFields()
    setDrawerVisible(true)
  }

  // 提交创建企业
  const handleSubmit = async (values: any) => {
    try {
      // TODO: 调用API创建企业
      message.success('创建成功')
      setDrawerVisible(false)
      // 刷新列表
    } catch {
      message.error('创建失败')
    }
  }

  // 上传PDF
  const handleUpload = (field: string, company: Company) => {
    setCurrentUploadField(field)
    setCurrentCompany(company)
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
        // 组件会将 file.url 或 file.thumbUrl 作为链接
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
  const handleUploadConfirm = () => {
    if (fileList.length === 0) {
      message.warning('请至少选择一个文件')
      return
    }
    // TODO: 调用API保存文件URL到数据库
    message.success('上传完成')
    setUploadModalVisible(false)
    setFileList([])
    // 刷新列表
  }

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

  // 操作菜单
  const getActionMenu = (record: Company): MenuProps => ({
    items: [
      {
        key: 'view',
        label: '查看',
        icon: <EyeOutlined />,
        onClick: () => router.push(`/companies/${record.id}`)
      },
      {
        key: 'applicants',
        label: '求职者信息',
        onClick: () => router.push(`/companies/${record.id}/applicants`)
      }
    ]
  })

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
    )
  }

  const columns = [
    {
      title: '企业名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      align: 'center' as const,
    },
    {
      title: '所属行业',
      dataIndex: 'industry',
      key: 'industry',
      width: 120,
      align: 'center' as const,
    },
    {
      title: '藤本',
      key: 'teihon',
      width: 150,
      align: 'center' as const,
      render: (_: any, record: Company) => renderPdfColumn('teihon', record)
    },
    {
      title: '决算报告书',
      key: 'financial_report',
      width: 150,
      align: 'center' as const,
      render: (_: any, record: Company) => renderPdfColumn('financial_report', record)
    },
    {
      title: '行业许可证',
      key: 'industry_license',
      width: 150,
      align: 'center' as const,
      render: (_: any, record: Company) => renderPdfColumn('industry_license', record)
    },
    {
      title: 'GMO合同',
      key: 'gmo_contract',
      width: 150,
      align: 'center' as const,
      render: (_: any, record: Company) => renderPdfColumn('gmo_contract', record)
    },
    {
      title: 'OTIT资料',
      key: 'otit_materials',
      width: 150,
      align: 'center' as const,
      render: (_: any, record: Company) => renderPdfColumn('otit_materials', record)
    },
    {
      title: '中央会资料',
      key: 'central_materials',
      width: 150,
      align: 'center' as const,
      render: (_: any, record: Company) => renderPdfColumn('central_materials', record)
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      align: 'center' as const,
      render: (_: any, record: Company) => (
        <Dropdown menu={getActionMenu(record)} trigger={['hover']}>
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      )
    }
  ]

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>企业管理</h2>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            创建企业
          </Button>
        </div>

        {/* 搜索区域 */}
        <Card style={{ marginBottom: 16 }}>
          <Form
            form={searchForm}
            layout="inline"
            style={{ width: '100%' }}
          >
            <Form.Item label="企业名称" style={{ marginBottom: 16 }}>
              <Input
                placeholder="搜索企业名称"
                prefix={<SearchOutlined />}
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                allowClear
                style={{ width: 200 }}
              />
            </Form.Item>
            <Form.Item label="所属行业" style={{ marginBottom: 16 }}>
              <Select
                placeholder="选择所属行业"
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
                重置搜索
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

      {/* 创建企业Drawer */}
      <Drawer
        title="创建企业"
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        width={600}
        placement="right"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="企业名称"
            rules={[{ required: true, message: '请输入企业名称' }]}
          >
            <Input placeholder="请输入企业名称" />
          </Form.Item>

          <Form.Item
            name="industry"
            label="所属行业"
            rules={[{ required: true, message: '请选择所属行业' }]}
          >
            <Select placeholder="请选择所属行业">
              <Option value="制造业">制造业</Option>
              <Option value="服务业">服务业</Option>
              <Option value="IT">IT</Option>
              <Option value="金融">金融</Option>
              <Option value="其他">其他</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                创建
              </Button>
              <Button onClick={() => setDrawerVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Drawer>

      {/* 上传PDF Modal */}
      <Modal
        title={`上传${currentUploadField === 'teihon' ? '藤本' : 
                currentUploadField === 'financial_report' ? '决算报告书' :
                currentUploadField === 'industry_license' ? '行业许可证' :
                currentUploadField === 'gmo_contract' ? 'GMO合同' :
                currentUploadField === 'otit_materials' ? 'OTIT资料' :
                currentUploadField === 'central_materials' ? '中央会资料' : '文件'}`}
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

