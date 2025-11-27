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
  Tag,
  message,
  Tooltip,
  Modal
} from 'antd'
import { 
  SearchOutlined, 
  ReloadOutlined,
  EyeOutlined
} from '@ant-design/icons'
import { useRouter } from 'next/navigation'

const { Option } = Select

interface Task {
  id: string
  created_at: string // 创建时间
  company_name: string // 企业名称
  work_order_name: string // 工单名称
  applicant_name: string // 求职者姓名
  error_fields: string[] // 有误信息（报错的字段列表）
  remark?: string // 备注
  reject_reason?: string // 驳回理由
  status: 'pending' | 'processed' | 'rejected' // 状态：待处理、已处理、被驳回
}

export default function TasksPage() {
  const router = useRouter()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [tasks, setTasks] = useState<Task[]>([])
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  // 搜索状态
  const [searchCompanyName, setSearchCompanyName] = useState('')
  const [searchWorkOrderName, setSearchWorkOrderName] = useState('')
  const [searchStatus, setSearchStatus] = useState<string>('')

  // 模拟数据
  useEffect(() => {
    setTasks([
      {
        id: '1',
        created_at: '2024-01-15 10:30:00',
        company_name: '示例企业A',
        work_order_name: '工单A',
        applicant_name: '张三',
        error_fields: ['原始简历', '护照', '省级考试证书'],
        remark: '需要补充完整信息',
        status: 'processed'
      },
      {
        id: '2',
        created_at: '2024-01-14 14:20:00',
        company_name: '示例企业B',
        work_order_name: '工单B',
        applicant_name: '李四',
        error_fields: ['身份证', '2寸照片'],
        reject_reason: '信息不完整',
        status: 'rejected'
      },
      {
        id: '3',
        created_at: '2024-01-13 09:15:00',
        company_name: '示例企业A',
        work_order_name: '工单C',
        applicant_name: '王五',
        error_fields: ['原始简历', '护照', '省级考试证书', '国检证书'],
        status: 'pending'
      }
    ])
  }, [])

  // 重置搜索
  const handleResetSearch = () => {
    setSearchCompanyName('')
    setSearchWorkOrderName('')
    setSearchStatus('')
    form.resetFields()
  }

  // 查看详情
  const handleViewDetail = (task: Task) => {
    setSelectedTask(task)
    setDetailModalVisible(true)
  }

  // 获取状态标签
  const getStatusTag = (status: string) => {
    const statusConfig = {
      pending: { color: 'orange', text: '待处理' },
      processed: { color: 'green', text: '已处理' },
      rejected: { color: 'red', text: '被驳回' }
    }
    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'default', text: status }
    return <Tag color={config.color}>{config.text}</Tag>
  }

  // 格式化有误信息显示
  const formatErrorFields = (fields: string[]) => {
    if (!fields || fields.length === 0) return '-'
    const displayText = fields.join('、')
    if (displayText.length > 20) {
      return (
        <Tooltip title={displayText}>
          <span>{displayText.substring(0, 20)}...</span>
        </Tooltip>
      )
    }
    return displayText
  }

  const columns = [
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      align: 'center' as const,
      sorter: true,
    },
    {
      title: '企业名称',
      dataIndex: 'company_name',
      key: 'company_name',
      width: 150,
      align: 'center' as const,
    },
    {
      title: '工单名称',
      dataIndex: 'work_order_name',
      key: 'work_order_name',
      width: 150,
      align: 'center' as const,
    },
    {
      title: '求职者姓名',
      dataIndex: 'applicant_name',
      key: 'applicant_name',
      width: 120,
      align: 'center' as const,
    },
    {
      title: '有误信息',
      dataIndex: 'error_fields',
      key: 'error_fields',
      width: 200,
      align: 'center' as const,
      render: (fields: string[]) => formatErrorFields(fields)
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      width: 150,
      align: 'center' as const,
      render: (remark: string) => remark || '-'
    },
    {
      title: '驳回理由',
      dataIndex: 'reject_reason',
      key: 'reject_reason',
      width: 150,
      align: 'center' as const,
      render: (reason: string) => reason || '-'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      align: 'center' as const,
      render: (status: string) => getStatusTag(status)
    },
    {
      title: '具体信息',
      key: 'action',
      width: 100,
      align: 'center' as const,
      render: (_: any, record: Task) => (
        <Button 
          type="link" 
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record)}
        >
          查看
        </Button>
      )
    }
  ]

  // 过滤任务
  const filteredTasks = tasks.filter(task => {
    if (searchCompanyName && !task.company_name.includes(searchCompanyName)) {
      return false
    }
    if (searchWorkOrderName && !task.work_order_name.includes(searchWorkOrderName)) {
      return false
    }
    if (searchStatus && task.status !== searchStatus) {
      return false
    }
    return true
  })

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <h2>任务中心</h2>
        </div>

        {/* 搜索区域 */}
        <Card style={{ marginBottom: 16 }}>
          <Form
            form={form}
            layout="inline"
            style={{ width: '100%' }}
          >
            <Form.Item label="企业名称" style={{ marginBottom: 16 }}>
              <Input
                placeholder="请输入你需要搜索的内容"
                prefix={<SearchOutlined />}
                value={searchCompanyName}
                onChange={(e) => setSearchCompanyName(e.target.value)}
                allowClear
                style={{ width: 200 }}
              />
            </Form.Item>
            <Form.Item label="工单名称" style={{ marginBottom: 16 }}>
              <Input
                placeholder="请输入你需要搜索的内容"
                prefix={<SearchOutlined />}
                value={searchWorkOrderName}
                onChange={(e) => setSearchWorkOrderName(e.target.value)}
                allowClear
                style={{ width: 200 }}
              />
            </Form.Item>
            <Form.Item label="状态" style={{ marginBottom: 16 }}>
              <Select
                placeholder="请输入你需要搜索的内容"
                value={searchStatus}
                onChange={setSearchStatus}
                allowClear
                style={{ width: 200 }}
              >
                <Option value="pending">待处理</Option>
                <Option value="processed">已处理</Option>
                <Option value="rejected">被驳回</Option>
              </Select>
            </Form.Item>
            <Form.Item style={{ marginBottom: 16 }}>
              <Button icon={<ReloadOutlined />} onClick={handleResetSearch}>
                重置筛选
              </Button>
            </Form.Item>
          </Form>
        </Card>

        {/* 任务列表 */}
        <Card>
          <div style={{ marginBottom: 16, fontWeight: 500 }}>任务列表</div>
          <Table
            columns={columns}
            dataSource={filteredTasks}
            loading={loading}
            rowKey="id"
            pagination={{
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 项数据`,
              pageSizeOptions: ['10', '20', '50', '100'],
              defaultPageSize: 20,
            }}
          />
        </Card>
      </Card>

      {/* 详情Modal */}
      <Modal
        title="任务详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={800}
      >
        {selectedTask && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <strong>创建时间：</strong>{selectedTask.created_at}
            </div>
            <div style={{ marginBottom: 16 }}>
              <strong>企业名称：</strong>{selectedTask.company_name}
            </div>
            <div style={{ marginBottom: 16 }}>
              <strong>工单名称：</strong>{selectedTask.work_order_name}
            </div>
            <div style={{ marginBottom: 16 }}>
              <strong>求职者姓名：</strong>{selectedTask.applicant_name}
            </div>
            <div style={{ marginBottom: 16 }}>
              <strong>有误信息：</strong>
              <div style={{ marginTop: 8 }}>
                {selectedTask.error_fields.map((field, index) => (
                  <Tag key={index} style={{ marginBottom: 4 }}>{field}</Tag>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <strong>状态：</strong>{getStatusTag(selectedTask.status)}
            </div>
            {selectedTask.remark && (
              <div style={{ marginBottom: 16 }}>
                <strong>备注：</strong>{selectedTask.remark}
              </div>
            )}
            {selectedTask.reject_reason && (
              <div style={{ marginBottom: 16 }}>
                <strong>驳回理由：</strong>{selectedTask.reject_reason}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

