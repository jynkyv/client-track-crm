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
  ReloadOutlined,
  FileExcelOutlined,
  DeleteOutlined
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useRouter } from '@/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { getFileUrl } from '@/lib/utils'
import { useTranslations, useLocale } from 'next-intl'
import * as XLSX from 'xlsx'

const { Option } = Select

import { type Company, type DocumentFile } from '@/lib/supabase'
import { generateUnionJoinApplication } from '@/lib/pdfGenerator'
import { saveAs } from 'file-saver'

const INDUSTRIES = [
  { value: '農業・林業関係', label: '農業・林業関係' },
  { value: '漁業関係', label: '漁業関係' },
  { value: '建設関係', label: '建設関係' },
  { value: '食品製造関係', label: '食品製造関係' },
  { value: '繊維・衣服関係', label: '繊維・衣服関係' },
  { value: '機械・金属関係', label: '機械・金属関係' },
  { value: 'その他', label: 'その他' },
]

// Removed local Company interface definition in favor of imported one

export default function CompaniesPage() {
  const router = useRouter()
  const { canAccessCompanies, isJapaneseEmployee, user } = useAuth()
  const [searchForm] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [companies, setCompanies] = useState<Company[]>([])
  const [uploadModalVisible, setUploadModalVisible] = useState(false)
  const [currentUploadField, setCurrentUploadField] = useState<string>('')
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null)
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [activeUploads, setActiveUploads] = useState(0)

  // 查看文件 Modal 状态
  const [viewModalVisible, setViewModalVisible] = useState(false)
  const [currentViewFiles, setCurrentViewFiles] = useState<DocumentFile[]>([])
  const [currentViewField, setCurrentViewField] = useState<string>('')
  const [industryCounts, setIndustryCounts] = useState<Record<string, { total: number, joined: number }>>({})

  const t = useTranslations('Company')
  const tCommon = useTranslations('Common')
  const locale = useLocale()

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

      // 日方员工只能看到自己创建的企业
      if (isJapaneseEmployee && user?.id) {
        query = query.eq('owner_id', user.id)
      }

      // 应用搜索条件
      if (searchName) {
        query = query.ilike('name', `%${searchName}%`)
      }
      if (searchIndustry) {
        query = query.ilike('industry', `%${searchIndustry}%`)
      }

      const { data: companiesData, error } = await query

      if (error) throw error

      // Calculate risk status
      // 1. Get all company IDs
      const companyIds = (companiesData || []).map(c => c.id)

      if (companyIds.length > 0) {
        // 2. Find companies with pending visa applicants
        // We need to go through work_orders -> customers
        // First get work orders for these companies
        const { data: workOrders } = await supabase
          .from('work_orders')
          .select('id, company_id')
          .in('company_id', companyIds)

        if (workOrders && workOrders.length > 0) {
          const workOrderIds = workOrders.map(wo => wo.id)

          // Get customers with pending visa status
          const { data: riskyCustomers } = await supabase
            .from('customers')
            .select('work_order_id')
            .in('work_order_id', workOrderIds)
            .eq('visa_status', 'pending')

          if (riskyCustomers && riskyCustomers.length > 0) {
            const riskyWorkOrderIds = new Set(riskyCustomers.map(rc => rc.work_order_id))
            const riskyCompanyIds = new Set(
              workOrders
                .filter(wo => riskyWorkOrderIds.has(wo.id))
                .map(wo => wo.company_id)
            )

            // Mark companies as risky
            const companiesWithRisk = (companiesData || []).map(c => ({
              ...c,
              has_pending_visa: riskyCompanyIds.has(c.id)
            }))

            // Sort: Risky companies first, then by created_at (default)
            companiesWithRisk.sort((a, b) => {
              const aRisk = a.has_pending_visa && !a.is_association_member
              const bRisk = b.has_pending_visa && !b.is_association_member
              if (aRisk && !bRisk) return -1
              if (!aRisk && bRisk) return 1
              return 0
            })

            setCompanies(companiesWithRisk)
            setLoading(false)
            return
          }
        }
      }

      // Calculate industry counts
      const industryCounts: Record<string, { total: number, joined: number }> = {}
      INDUSTRIES.forEach(i => industryCounts[i.value] = { total: 0, joined: 0 })

      const countsData = companiesData || []
      countsData.forEach(c => {
        const industry = c.industry || '其他'
        if (!industryCounts[industry]) {
          // Try to find if it matches one of the known ones loosely or just add it
          // For now, if not in list, maybe ignore or put in separate bucket?
          // Since we want to display counts on the dropdown options, we only care about the options we have.
          // If data is old and has different industry names, they won't match.
        } else {
          industryCounts[industry].total++
          if (c.is_association_member) {
            industryCounts[industry].joined++
          }
        }
      })

      // We need to pass this state to the render or store it.
      // Since Render is using `INDUSTRIES` constant, we might need a state for counts or just Map.
      setIndustryCounts(industryCounts)

      setCompanies(companiesData || [])
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
    if (fileList.length === 0 || !currentCompany || !currentUploadField) {
      message.warning(t('messages.selectFileWarning'))
      setUploading(false)
      return
    }

    try {
      // 获取已上传文件的URL列表并添加时间戳
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
      const currentFiles = (currentCompany[currentUploadField as keyof Company] as DocumentFile[]) || []

      // 合并新旧文件列表
      const updatedFiles = [...currentFiles, ...newFiles]

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
    } finally {
      setUploading(false)
    }
  }

  // 查看多个PDF
  const handleViewPdfs = (files: DocumentFile[] | undefined, field: string, company: Company) => {
    if (!files || files.length === 0) {
      message.warning(t('messages.noFileWarning'))
      return
    }
    setCurrentViewFiles(files)
    setCurrentViewField(field)
    setCurrentCompany(company)
    setViewModalVisible(true)
  }

  // 删除单个PDF文件
  const handleDeleteFile = async (url: string, field: string, company: Company) => {
    Modal.confirm({
      title: t('messages.confirmDeleteTitle'),
      content: t('messages.confirmDeleteContent'),
      okText: t('messages.confirmOk'),
      cancelText: t('messages.confirmCancel'),
      okButtonProps: { danger: true },
      async onOk() {
        try {
          const currentFilesRaw = (company[field as keyof Company] as any[]) || []

          // Helper to parse file
          const parseFile = (file: any): DocumentFile | null => {
            if (typeof file === 'string') {
              try {
                const parsed = JSON.parse(file)
                return (parsed && typeof parsed === 'object') ? parsed : { url: file, uploadedAt: '' }
              } catch {
                return { url: file, uploadedAt: '' }
              }
            }
            return file
          }

          const currentFiles = currentFilesRaw.map(parseFile).filter(Boolean) as DocumentFile[]
          const updatedFiles = currentFiles.filter((f) => f.url !== url)

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
          fetchCompanies()
        } catch (error) {
          console.error('删除文件失败:', error)
          message.error(t('messages.deleteError'))
        }
      }
    })
  }

  // PDF操作列渲染
  const renderPdfColumn = (field: string, record: Company) => {
    const files = record[field as keyof Company] as DocumentFile[] | undefined
    const fileCount = files?.length || 0
    return (
      <Space>
        {field !== 'association_application_form' && (
          <Button
            size="small"
            icon={<UploadOutlined />}
            onClick={() => handleUpload(field, record)}
          >
            {t('actions.upload')}
          </Button>
        )}
        <Button
          size="small"
          icon={<FilePdfOutlined />}
          onClick={() => handleViewPdfs(files, field, record)}
          disabled={fileCount === 0}
        >
          {t('actions.view')}{fileCount > 0 ? `(${fileCount})` : ''}
        </Button>
      </Space>
    )
  }

  // 导出组合成员
  const handleExportAssociationMembers = async () => {
    try {
      message.loading(tCommon('exporting'))

      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('is_association_member', true)
        .order('created_at', { ascending: false })

      if (error) throw error

      if (!data || data.length === 0) {
        message.info(t('messages.noAssociationMembers'))
        return
      }

      // Import libraries dynamically or ensure they are imported at the top
      // Assuming imports will be added separately or dynamic import here if needed
      // For this replace, I will assume dynamic import or rely on top level (which needs to be added)
      // BUT for cleaner code, I will use dynamic import inside function or assume top level is handled in next step.
      // Let's use dynamic import to avoid potential SSR issues or massive bundle size if not tree-shaken, 
      // but 'docx' is usually fine. Let's assume standard import for now, but I need to add imports to file top.
      // Since I can only replace a chunk, I will use dynamic import within the function for safety and simplicity of this tool call.

      const { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, TextRun, AlignmentType, BorderStyle, VerticalAlign } = await import('docx');
      const FileSaver = await import('file-saver');
      const saveAs = FileSaver.default || FileSaver.saveAs || FileSaver;

      // Helper to create styled paragraphs
      const createText = (text: string, alignment: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.CENTER) => {
        const lines = text.split('\n');
        return new Paragraph({
          alignment: alignment,
          children: lines.map((line, index) =>
            new TextRun({
              text: line,
              font: "ＭＳ 明朝", // MS Mincho
              size: 22, // 11pt
              break: index > 0 ? 1 : 0
            })
          )
        });
      };

      const tableRows = [
        new TableRow({
          height: { value: 782, rule: 'atLeast' }, // Based on XML
          children: [
            new TableCell({ verticalAlign: VerticalAlign.CENTER, width: { size: 2410, type: WidthType.DXA }, children: [createText("氏　　　名", AlignmentType.CENTER)] }),
            new TableCell({ verticalAlign: VerticalAlign.CENTER, width: { size: 2297, type: WidthType.DXA }, children: [createText("住　　　所", AlignmentType.CENTER)] }),
            new TableCell({ verticalAlign: VerticalAlign.CENTER, width: { size: 822, type: WidthType.DXA }, children: [createText("加入日", AlignmentType.CENTER)] }),
            new TableCell({ verticalAlign: VerticalAlign.CENTER, width: { size: 2126, type: WidthType.DXA }, children: [createText("業　　　種", AlignmentType.CENTER)] }),
            new TableCell({ verticalAlign: VerticalAlign.CENTER, width: { size: 1418, type: WidthType.DXA }, children: [createText("資本金の額\n又は\n出資の総額", AlignmentType.CENTER)] }),
            new TableCell({ verticalAlign: VerticalAlign.CENTER, width: { size: 708, type: WidthType.DXA }, children: [createText("常用\n従業\n員数", AlignmentType.CENTER)] }),
          ],
        }),
      ];

      data.forEach(company => {
        tableRows.push(
          new TableRow({
            height: { value: 1077, rule: 'atLeast' }, // Based on XML
            children: [
              new TableCell({
                verticalAlign: VerticalAlign.CENTER,
                children: [
                  createText(company.name || '', AlignmentType.LEFT),
                  createText("代表取締役", AlignmentType.LEFT),
                  createText(company.representative || '', AlignmentType.LEFT),
                ],
              }),
              new TableCell({ verticalAlign: VerticalAlign.CENTER, children: [createText(company.address || '', AlignmentType.LEFT)] }),
              new TableCell({ verticalAlign: VerticalAlign.CENTER, children: [createText("1", AlignmentType.CENTER)] }),
              new TableCell({ verticalAlign: VerticalAlign.CENTER, children: [createText(company.industry || '', AlignmentType.CENTER)] }),
              new TableCell({ verticalAlign: VerticalAlign.CENTER, children: [createText(company.registered_capital || '', AlignmentType.CENTER)] }),
              new TableCell({ verticalAlign: VerticalAlign.CENTER, children: [createText(`${company.employee_count || 0}人`, AlignmentType.CENTER)] }),
            ],
          })
        );
      });

      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                margin: {
                  top: 1247,
                  right: 1191,
                  bottom: 964,
                  left: 1418,
                },
              },
            },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 500, after: 200 }, // Reduced line spacing for title slightly, but kept some visual separation
                children: [
                  new TextRun({
                    text: "組合会員一覧",
                    font: "ＭＳ 明朝",
                    size: 32, // 16pt based on XML
                    bold: true,
                    color: "000000",
                  })
                ]
              }),
              new Table({
                rows: tableRows,
                width: { size: 9781, type: WidthType.DXA }, // Exact total width from XML
                margins: {
                  top: 0,
                  bottom: 0,
                  left: 108,
                  right: 108,
                },
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 4 }, // size 4 = 1/2 pt? XML says sz="4"
                  bottom: { style: BorderStyle.SINGLE, size: 4 },
                  left: { style: BorderStyle.SINGLE, size: 4 },
                  right: { style: BorderStyle.SINGLE, size: 4 },
                  insideHorizontal: { style: BorderStyle.SINGLE, size: 4 },
                  insideVertical: { style: BorderStyle.SINGLE, size: 4 },
                }
              }),
            ],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `組合会員一覧_${new Date().toISOString().split('T')[0]}.docx`);

      message.success(tCommon('exportSuccess'))
    } catch (error) {
      console.error('Export failed:', error)
      message.error(tCommon('exportError'))
    }
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
      title: '创建时间', // Creation Time
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      align: 'center' as const,
      render: (val: string) => val ? new Date(val).toLocaleDateString() : '-'
    },
    {
      title: t('columns.isAssociationMember'),
      dataIndex: 'is_association_member',
      key: 'is_association_member',
      width: 120,
      align: 'center' as const,
      render: (val: boolean) => val ? '是' : '否'
    },
    {
      title: t('columns.teihon'),
      key: 'teihon',
      width: 150,
      align: 'center' as const,
      render: (_: any, record: Company) => renderPdfColumn('teihon', record)
    },
    {
      width: 150,
      align: 'center' as const,
      render: (_: any, record: Company) => renderPdfColumn('financial_report', record)
    },
    {
      title: t('columns.associationApplicationForm'),
      render: (_: any, record: Company) => {
        // Only show if first_training_at is set (meaning they have a trainee)
        if (!record.first_training_at) {
          return <span style={{ color: '#ccc' }}>-</span>
        }
        return (
          <Button
            type="link"
            size="small"
            icon={<FilePdfOutlined />}
            onClick={async () => {
              try {
                message.loading('正在生成文件...')
                const pdfBytes = await generateUnionJoinApplication(record)
                const blob = new Blob([pdfBytes], { type: 'application/pdf' })
                saveAs(blob, `${record.name}_入会申请书.pdf`)
                message.success('下载成功')
              } catch (e) {
                console.error(e)
                message.error('生成失败: ' + (e as Error).message)
              }
            }}
          >
            下载申请书
          </Button>
        )
      }
    },


    // {
    //   title: t('columns.otitMaterials'),
    //   key: 'otit_materials',
    //   width: 150,
    //   align: 'center' as const,
    //   render: (_: any, record: Company) => renderPdfColumn('otit_materials', record)
    // },
    // {
    //   title: t('columns.centralMaterials'),
    //   key: 'central_materials',
    //   width: 150,
    //   align: 'center' as const,
    //   render: (_: any, record: Company) => renderPdfColumn('central_materials', record)
    // },
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
          <Space>
            <Button
              icon={<FileExcelOutlined />}
              onClick={handleExportAssociationMembers}
            >
              {t('actions.exportAssociationMembers')}
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              {t('create')}
            </Button>
          </Space>
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
                style={{ width: 300 }}
              >
                {INDUSTRIES.map(i => {
                  const count = industryCounts[i.value] || { total: 0, joined: 0 }
                  return (
                    <Option key={i.value} value={i.value}>{`${i.label} [${count.joined}/${count.total}]`}</Option>
                  )
                })}

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
          scroll={{ x: 'max-content' }}
          rowClassName={(record: any) => {
            // Red highlight if NOT association member AND has pending visa applicants
            if (record.is_association_member === false && record.has_pending_visa) {
              return 'bg-red-100 hover:bg-red-200'
            }
            return ''
          }}
        />
        <style jsx global>{`
          .bg-red-100, .bg-red-100 .ant-table-cell {
            background-color: #fee2e2 !important;
          }
          .bg-red-100:hover, .bg-red-100:hover .ant-table-cell {
            background-color: #fecaca !important;
          }
          /* Ensure Ant Table hover doesn't override completely or looks okay */
          .ant-table-tbody > tr.bg-red-100.ant-table-row:hover > td,
          .ant-table-tbody > tr.bg-red-100 > td.ant-table-cell-row-hover {
            background-color: #fecaca !important;
          }
        `}</style>
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
      <Modal
        title={`查看${currentViewField === 'teihon' ? '藤本' :
          currentViewField === 'financial_report' ? '决算报告书' :
            currentViewField === 'industry_license' ? '行业许可证' :
              currentViewField === 'gmo_contract' ? 'GMO合同' :
                currentViewField === 'otit_materials' ? 'OTIT资料' :
                  currentViewField === 'central_materials' ? '中央会资料' : '文件'}`
        }
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
          renderItem={(file: any, index) => {
            let fileUrl = ''
            let uploadTime = null

            if (typeof file === 'string') {
              try {
                const parsed = JSON.parse(file)
                if (parsed && typeof parsed === 'object') {
                  fileUrl = parsed.url
                  uploadTime = parsed.uploadedAt
                } else {
                  fileUrl = file
                }
              } catch {
                fileUrl = file
              }
            } else if (file && typeof file === 'object') {
              fileUrl = file.url
              uploadTime = file.uploadedAt
            }

            if (!fileUrl) return null

            return (
              <List.Item
                actions={[
                  <Button
                    key="view"
                    type="link"
                    icon={<EyeOutlined />}
                    onClick={() => window.open(getFileUrl(fileUrl), '_blank')}
                  >
                    查看
                  </Button>,
                  currentCompany && (
                    <Button
                      key="delete"
                      type="link"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDeleteFile(fileUrl, currentViewField, currentCompany)}
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
                      <span>{fileUrl.split('/').pop()}</span>
                      <span style={{ fontSize: '12px', color: '#999' }}>
                        {t('uploadTime')}: {uploadTime ? new Date(uploadTime).toLocaleString(locale) : '-'}
                      </span>
                    </Space>
                  }
                />
              </List.Item>
            )
          }}
        />
      </Modal>
    </div >
  )
}

