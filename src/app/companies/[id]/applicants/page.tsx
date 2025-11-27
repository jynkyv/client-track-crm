'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  Card, 
  Button, 
  Row, 
  Col, 
  Descriptions, 
  Tabs,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Modal,
  Drawer,
  message,
  Upload,
  DatePicker,
  Tag
} from 'antd'
import { 
  ArrowLeftOutlined,
  PlusOutlined,
  FileTextOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'

const { Option } = Select
const { TextArea } = Input

interface WorkOrder {
  id: string
  name: string // 工单名称
  position: string // 岗位名称
  recruit_count: number // 招聘人数
  salary: string // 薪资
  work_time: string // 工作时间
  rest_days: string // 休息天数
  benefits: string // 工作待遇
}

interface Applicant {
  id: string
  work_order_id: string
  name: string // 姓名
  gender: string // 性别
  birth_date: string // 出生年月日
  household_location: string // 户籍所在地
  current_residence: string // 现居住地
  contact: string // 联系方式
  wechat: string // 实名微信号
  emergency_contact: string // 紧急联系人
  emergency_phone: string // 紧急联系人电话
  manager_name?: string // 负责人姓名（中方员工姓名）
  status?: string // 状态
  resume?: string // 原始简历
  passport?: string // 护照
  household_book?: string // 户口本
  id_card?: string // 身份证
  photo_2inch?: string // 2寸照片
  credit_report?: string // 征信报告
  no_crime_cert?: string // 无犯罪证明
  national_cert?: string // 国检证书
  provincial_cert?: string // 省级考试证书
  employment_contract?: string // 雇佣合同
  japan_agency_contract?: string // 赴日中介合同
  immigration_materials?: string // 入管局资料
}

export default function ApplicantsPage() {
  const params = useParams()
  const router = useRouter()
  const companyId = params.id as string
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [activeTab, setActiveTab] = useState<string>('')
  const [workOrderDrawerVisible, setWorkOrderDrawerVisible] = useState(false)
  const [errorDrawerVisible, setErrorDrawerVisible] = useState(false)
  const [currentApplicant, setCurrentApplicant] = useState<Applicant | null>(null)
  const [workOrderForm] = Form.useForm()
  const [errorForm] = Form.useForm()

  // 模拟数据
  useEffect(() => {
    setWorkOrders([
      {
        id: '1',
        name: '工单A',
        position: '软件工程师',
        recruit_count: 5,
        salary: '30-40万日元/月',
        work_time: '9:00-18:00',
        rest_days: '周末双休',
        benefits: '五险一金，带薪年假'
      }
    ])
    setActiveTab('1')
    setApplicants([
      {
        id: '1',
        work_order_id: '1',
        name: '张三',
        gender: '男',
        birth_date: '1990-01-01',
        household_location: '北京市',
        current_residence: '上海市',
        contact: '13800138000',
        wechat: 'zhangsan',
        emergency_contact: '李四',
        emergency_phone: '13900139000',
        manager_name: '王五',
        status: '待面试',
      }
    ])
  }, [])

  // 创建工单
  const handleCreateWorkOrder = () => {
    workOrderForm.resetFields()
    setWorkOrderDrawerVisible(true)
  }

  // 提交工单
  const handleWorkOrderSubmit = async (values: any) => {
    try {
      // TODO: 调用API创建工单
      message.success('创建工单成功')
      setWorkOrderDrawerVisible(false)
    } catch {
      message.error('创建工单失败')
    }
  }

  // 报错
  const handleReportError = (applicant: Applicant) => {
    setCurrentApplicant(applicant)
    errorForm.resetFields()
    setErrorDrawerVisible(true)
  }

  // 提交报错
  const handleErrorSubmit = async (values: any) => {
    try {
      // TODO: 调用API提交报错
      // values.field 现在是数组，包含所有选中的字段
      const selectedFields = values.field || []
      if (selectedFields.length === 0) {
        message.warning('请至少选择一个字段')
        return
      }
      message.success(`报错提交成功，已选择 ${selectedFields.length} 个字段`)
      setErrorDrawerVisible(false)
    } catch {
      message.error('报错提交失败')
    }
  }

  // 查看文件
  const handleViewFile = (url?: string) => {
    if (!url) {
      message.warning('暂无文件')
      return
    }
    window.open(url, '_blank')
  }

  // Tab项
  const tabItems = workOrders.length > 0 
    ? workOrders.map(order => ({
        key: order.id,
        label: order.name,
        children: (
          <div>
            {/* 工单信息卡片 */}
            <Card 
              title="工单信息" 
              style={{ marginBottom: 16 }}
            >
              <Descriptions bordered column={2}>
                <Descriptions.Item label="工单名称">{order.name}</Descriptions.Item>
                <Descriptions.Item label="岗位名称">{order.position}</Descriptions.Item>
                <Descriptions.Item label="招聘人数">{order.recruit_count}人</Descriptions.Item>
                <Descriptions.Item label="薪资">{order.salary}</Descriptions.Item>
                <Descriptions.Item label="工作时间">{order.work_time}</Descriptions.Item>
                <Descriptions.Item label="休息天数">{order.rest_days}</Descriptions.Item>
                <Descriptions.Item label="工作待遇" span={2}>{order.benefits}</Descriptions.Item>
              </Descriptions>
            </Card>

        {/* 求职者信息 */}
        <Card title="求职者信息">
          {applicants
            .filter(app => app.work_order_id === order.id)
            .map(applicant => (
              <Card 
                key={applicant.id} 
                type="inner" 
                style={{ marginBottom: 16 }}
                extra={
                  <Button 
                    danger 
                    icon={<ExclamationCircleOutlined />}
                    onClick={() => handleReportError(applicant)}
                  >
                    报错
                  </Button>
                }
              >
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12} md={8}>
                    <div><strong>姓名：</strong>{applicant.name}</div>
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <div><strong>状态：</strong>
                      {applicant.status ? (
                        <Tag color={
                          applicant.status === '待面试' ? 'blue' :
                          applicant.status === '面试中' ? 'orange' :
                          applicant.status === '已通过' ? 'green' :
                          applicant.status === '已拒绝' ? 'red' :
                          'default'
                        }>
                          {applicant.status}
                        </Tag>
                      ) : '-'}
                    </div>
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <div><strong>性别：</strong>{applicant.gender}</div>
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <div><strong>出生年月日：</strong>{applicant.birth_date}</div>
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <div><strong>户籍所在地：</strong>{applicant.household_location}</div>
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <div><strong>现居住地：</strong>{applicant.current_residence}</div>
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <div><strong>联系方式：</strong>{applicant.contact}</div>
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <div><strong>实名微信号：</strong>{applicant.wechat}</div>
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <div><strong>紧急联系人：</strong>{applicant.emergency_contact}</div>
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <div><strong>紧急联系人电话：</strong>{applicant.emergency_phone}</div>
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <div><strong>负责人姓名（中方员工姓名）：</strong>{applicant.manager_name || '-'}</div>
                  </Col>
                </Row>

                <div style={{ marginTop: 16 }}>
                  <h4>文档资料</h4>
                  <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} md={8}>
                      <div><strong>原始简历：</strong>
                        <Button 
                          type="link" 
                          icon={<FileTextOutlined />}
                          onClick={() => handleViewFile(applicant.resume)}
                          disabled={!applicant.resume}
                        >
                          查看
                        </Button>
                      </div>
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                      <div><strong>护照：</strong>
                        <Button 
                          type="link" 
                          icon={<FileTextOutlined />}
                          onClick={() => handleViewFile(applicant.passport)}
                          disabled={!applicant.passport}
                        >
                          查看
                        </Button>
                      </div>
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                      <div><strong>户口本：</strong>
                        <Button 
                          type="link" 
                          icon={<FileTextOutlined />}
                          onClick={() => handleViewFile(applicant.household_book)}
                          disabled={!applicant.household_book}
                        >
                          查看
                        </Button>
                      </div>
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                      <div><strong>身份证：</strong>
                        <Button 
                          type="link" 
                          icon={<FileTextOutlined />}
                          onClick={() => handleViewFile(applicant.id_card)}
                          disabled={!applicant.id_card}
                        >
                          查看
                        </Button>
                      </div>
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                      <div><strong>2寸照片：</strong>
                        <Button 
                          type="link" 
                          icon={<FileTextOutlined />}
                          onClick={() => handleViewFile(applicant.photo_2inch)}
                          disabled={!applicant.photo_2inch}
                        >
                          查看
                        </Button>
                      </div>
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                      <div><strong>征信报告：</strong>
                        <Button 
                          type="link" 
                          icon={<FileTextOutlined />}
                          onClick={() => handleViewFile(applicant.credit_report)}
                          disabled={!applicant.credit_report}
                        >
                          查看
                        </Button>
                      </div>
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                      <div><strong>无犯罪证明：</strong>
                        <Button 
                          type="link" 
                          icon={<FileTextOutlined />}
                          onClick={() => handleViewFile(applicant.no_crime_cert)}
                          disabled={!applicant.no_crime_cert}
                        >
                          查看
                        </Button>
                      </div>
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                      <div><strong>国检证书：</strong>
                        <Button 
                          type="link" 
                          icon={<FileTextOutlined />}
                          onClick={() => handleViewFile(applicant.national_cert)}
                          disabled={!applicant.national_cert}
                        >
                          查看
                        </Button>
                      </div>
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                      <div><strong>省级考试证书：</strong>
                        <Button 
                          type="link" 
                          icon={<FileTextOutlined />}
                          onClick={() => handleViewFile(applicant.provincial_cert)}
                          disabled={!applicant.provincial_cert}
                        >
                          查看
                        </Button>
                      </div>
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                      <div><strong>雇佣合同：</strong>
                        <Button 
                          type="link" 
                          icon={<FileTextOutlined />}
                          onClick={() => handleViewFile(applicant.employment_contract)}
                          disabled={!applicant.employment_contract}
                        >
                          查看
                        </Button>
                      </div>
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                      <div><strong>赴日中介合同：</strong>
                        <Button 
                          type="link" 
                          icon={<FileTextOutlined />}
                          onClick={() => handleViewFile(applicant.japan_agency_contract)}
                          disabled={!applicant.japan_agency_contract}
                        >
                          查看
                        </Button>
                      </div>
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                      <div><strong>入管局资料：</strong>
                        <Button 
                          type="link" 
                          icon={<FileTextOutlined />}
                          onClick={() => handleViewFile(applicant.immigration_materials)}
                          disabled={!applicant.immigration_materials}
                        >
                          查看
                        </Button>
                      </div>
                    </Col>
                  </Row>
                </div>
              </Card>
            ))}
        </Card>
      </div>
    )
  }))
    : [
        {
          key: 'empty',
          label: '无工单',
          children: (
            <Card 
              title="工单信息" 
              extra={
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />}
                  onClick={handleCreateWorkOrder}
                >
                  创建工单
                </Button>
              }
            >
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                暂无工单信息，请先创建工单
              </div>
            </Card>
          )
        }
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

      <Card>
        {workOrders.length > 0 ? (
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            tabBarExtraContent={
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={handleCreateWorkOrder}
              >
                创建工单
              </Button>
            }
          />
        ) : (
          <Card 
            title="工单信息" 
            extra={
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={handleCreateWorkOrder}
              >
                创建工单
              </Button>
            }
          >
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
              暂无工单信息，请先创建工单
            </div>
          </Card>
        )}
      </Card>

      {/* 创建工单Drawer */}
      <Drawer
        title="创建工单"
        open={workOrderDrawerVisible}
        onClose={() => setWorkOrderDrawerVisible(false)}
        width={600}
        placement="right"
      >
        <Form
          form={workOrderForm}
          layout="vertical"
          onFinish={handleWorkOrderSubmit}
        >
          <Form.Item
            name="name"
            label="工单名称"
            rules={[{ required: true, message: '请输入工单名称' }]}
          >
            <Input placeholder="请输入工单名称" />
          </Form.Item>

          <Form.Item
            name="position"
            label="岗位名称"
            rules={[{ required: true, message: '请输入岗位名称' }]}
          >
            <Input placeholder="请输入岗位名称" />
          </Form.Item>

          <Form.Item
            name="recruit_count"
            label="招聘人数"
            rules={[{ required: true, message: '请输入招聘人数' }]}
          >
            <InputNumber 
              min={1} 
              placeholder="请输入招聘人数" 
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="salary"
            label="薪资"
            rules={[{ required: true, message: '请输入薪资' }]}
          >
            <Input placeholder="请输入薪资" />
          </Form.Item>

          <Form.Item
            name="work_time"
            label="工作时间"
            rules={[{ required: true, message: '请输入工作时间' }]}
          >
            <Input placeholder="请输入工作时间" />
          </Form.Item>

          <Form.Item
            name="rest_days"
            label="休息天数"
            rules={[{ required: true, message: '请输入休息天数' }]}
          >
            <Input placeholder="请输入休息天数" />
          </Form.Item>

          <Form.Item
            name="benefits"
            label="工作待遇"
            rules={[{ required: true, message: '请输入工作待遇' }]}
          >
            <TextArea rows={4} placeholder="请输入工作待遇" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                创建
              </Button>
              <Button onClick={() => setWorkOrderDrawerVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Drawer>

      {/* 报错Drawer */}
      <Drawer
        title="报错"
        open={errorDrawerVisible}
        onClose={() => setErrorDrawerVisible(false)}
        width={600}
        placement="right"
      >
        <Form
          form={errorForm}
          layout="vertical"
          onFinish={handleErrorSubmit}
        >
          <Form.Item
            name="field"
            label="选择字段（可多选）"
            rules={[{ required: true, message: '请至少选择一个字段' }]}
          >
            <Select 
              mode="multiple"
              placeholder="请选择需要报错的字段（可多选）"
              maxTagCount="responsive"
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            >
              <Option value="name" label="姓名">姓名</Option>
              <Option value="gender" label="性别">性别</Option>
              <Option value="birth_date" label="出生年月日">出生年月日</Option>
              <Option value="household_location" label="户籍所在地">户籍所在地</Option>
              <Option value="current_residence" label="现居住地">现居住地</Option>
              <Option value="contact" label="联系方式">联系方式</Option>
              <Option value="wechat" label="实名微信号">实名微信号</Option>
              <Option value="emergency_contact" label="紧急联系人">紧急联系人</Option>
              <Option value="emergency_phone" label="紧急联系人电话">紧急联系人电话</Option>
              <Option value="manager_name" label="负责人姓名（中方员工姓名）">负责人姓名（中方员工姓名）</Option>
              <Option value="status" label="状态">状态</Option>
              <Option value="resume" label="原始简历">原始简历</Option>
              <Option value="passport" label="护照">护照</Option>
              <Option value="household_book" label="户口本">户口本</Option>
              <Option value="id_card" label="身份证">身份证</Option>
              <Option value="photo_2inch" label="2寸照片">2寸照片</Option>
              <Option value="credit_report" label="征信报告">征信报告</Option>
              <Option value="no_crime_cert" label="无犯罪证明">无犯罪证明</Option>
              <Option value="national_cert" label="国检证书">国检证书</Option>
              <Option value="provincial_cert" label="省级考试证书">省级考试证书</Option>
              <Option value="employment_contract" label="雇佣合同">雇佣合同</Option>
              <Option value="japan_agency_contract" label="赴日中介合同">赴日中介合同</Option>
              <Option value="immigration_materials" label="入管局资料">入管局资料</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="reason"
            label="报错理由"
            rules={[{ required: true, message: '请输入报错理由' }]}
          >
            <TextArea rows={4} placeholder="请输入报错理由" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                提交
              </Button>
              <Button onClick={() => setErrorDrawerVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  )
}

