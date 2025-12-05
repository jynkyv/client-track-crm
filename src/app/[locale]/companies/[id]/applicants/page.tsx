'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
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
  const { canAccessCompanies } = useAuth()
  const companyId = params.id as string
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [activeTab, setActiveTab] = useState<string>('')
  const [workOrderDrawerVisible, setWorkOrderDrawerVisible] = useState(false)
  const [errorDrawerVisible, setErrorDrawerVisible] = useState(false)
  const [currentApplicant, setCurrentApplicant] = useState<Applicant | null>(null)
  const [workOrderForm] = Form.useForm()
  const [errorForm] = Form.useForm()

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
      if (data && data.length > 0 && !activeTab) {
        setActiveTab(data[0].id)
      }
    } catch (error) {
      console.error('获取工单列表失败:', error)
      message.error('获取工单列表失败')
    }
  }

  // 获取求职者列表（包括applicants表和customers表中已绑定工单的客户）
  const fetchApplicants = async (workOrderId: string) => {
    try {
      // 从applicants表获取
      const { data: applicantsData, error: applicantsError } = await supabase
        .from('applicants')
        .select('*')
        .eq('work_order_id', workOrderId)
        .order('created_at', { ascending: false })

      if (applicantsError) throw applicantsError

      // 从customers表获取已绑定该工单的正式客户
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .eq('work_order_id', workOrderId)
        .not('real_name', 'is', null) // 只获取正式客户（有real_name的）
        .order('created_at', { ascending: false })

      if (customersError) throw customersError

      // 将customers数据转换为applicants格式
      const customersAsApplicants: Applicant[] = (customersData || []).map(customer => ({
        id: customer.id,
        work_order_id: customer.work_order_id || '',
        name: customer.real_name || customer.nickname || '',
        gender: customer.gender === 'male' ? '男' : customer.gender === 'female' ? '女' : customer.gender || '',
        birth_date: customer.birth_date || '',
        household_location: customer.household_location || '',
        current_residence: customer.current_residence || '',
        contact: customer.contact || customer.phone || '',
        wechat: customer.wechat || '',
        emergency_contact: customer.emergency_contact || '',
        emergency_phone: customer.emergency_phone || '',
        manager_name: '', // customers表中没有这个字段
        status: customer.stage2_status || '',
        resume: Array.isArray(customer.resume) ? customer.resume[0] : customer.resume || '',
        passport: Array.isArray(customer.passport) ? customer.passport[0] : customer.passport || '',
        household_book: Array.isArray(customer.household_book) ? customer.household_book[0] : customer.household_book || '',
        id_card: Array.isArray(customer.id_card) ? customer.id_card[0] : customer.id_card || '',
        photo_2inch: Array.isArray(customer.photo_2inch) ? customer.photo_2inch[0] : customer.photo_2inch || '',
        credit_report: Array.isArray(customer.credit_report) ? customer.credit_report[0] : customer.credit_report || '',
        no_crime_cert: Array.isArray(customer.no_crime_cert) ? customer.no_crime_cert[0] : customer.no_crime_cert || '',
        national_cert: Array.isArray(customer.national_cert) ? customer.national_cert[0] : customer.national_cert || '',
        provincial_cert: Array.isArray(customer.provincial_cert) ? customer.provincial_cert[0] : customer.provincial_cert || '',
        employment_contract: Array.isArray(customer.employment_contract) ? customer.employment_contract[0] : customer.employment_contract || '',
        japan_agency_contract: Array.isArray(customer.japan_agency_contract) ? customer.japan_agency_contract[0] : customer.japan_agency_contract || '',
        immigration_materials: Array.isArray(customer.immigration_materials) ? customer.immigration_materials[0] : customer.immigration_materials || '',
      }))

      // 合并两个列表
      const allApplicants = [...(applicantsData || []), ...customersAsApplicants]
      setApplicants(allApplicants)
    } catch (error) {
      console.error('获取求职者列表失败:', error)
      message.error('获取求职者列表失败')
    }
  }

  useEffect(() => {
    if (companyId) {
      fetchWorkOrders()
    }
  }, [companyId])

  useEffect(() => {
    if (activeTab) {
      fetchApplicants(activeTab)
    }
  }, [activeTab])

  // 创建工单
  const handleCreateWorkOrder = () => {
    workOrderForm.resetFields()
    setWorkOrderDrawerVisible(true)
  }

  // 提交工单
  const handleWorkOrderSubmit = async (values: any) => {
    try {
      const { error } = await supabase
        .from('work_orders')
        .insert([{
          company_id: companyId,
          name: values.name,
          position: values.position,
          recruit_count: values.recruit_count,
          salary: values.salary,
          work_time: values.work_time,
          rest_days: values.rest_days,
          benefits: values.benefits,
        }])

      if (error) throw error
      message.success('创建工单成功')
      setWorkOrderDrawerVisible(false)
      fetchWorkOrders()
    } catch (error) {
      console.error('创建工单失败:', error)
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
    if (!currentApplicant) return

    try {
      const selectedFields = values.field || []
      if (selectedFields.length === 0) {
        message.warning('请至少选择一个字段')
        return
      }

      // 获取当前工单信息
      const currentWorkOrder = workOrders.find(wo => wo.id === currentApplicant.work_order_id)
      const currentCompany = await supabase
        .from('companies')
        .select('name')
        .eq('id', companyId)
        .single()

      // 创建任务
      const { error } = await supabase
        .from('tasks')
        .insert([{
          company_id: companyId,
          company_name: currentCompany.data?.name || '',
          work_order_id: currentApplicant.work_order_id,
          work_order_name: currentWorkOrder?.name || '',
          applicant_name: currentApplicant.name,
          error_fields: selectedFields,
          remark: values.reason || '',
          status: 'pending',
        }])

      if (error) throw error
      message.success(`报错提交成功，已选择 ${selectedFields.length} 个字段`)
      setErrorDrawerVisible(false)
    } catch (error) {
      console.error('报错提交失败:', error)
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
                String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
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

