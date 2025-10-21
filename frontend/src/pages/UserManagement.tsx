import React, { useState } from 'react'
import { 
  Card, 
  Table, 
  Button, 
  Modal, 
  Form, 
  Input, 
  Select, 
  message, 
  Space, 
  Popconfirm,
  Tag,
  Avatar,
  Tooltip
} from 'antd'
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  UserOutlined,
  ReloadOutlined,
  SearchOutlined
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { userApi } from '../services/api'
import { useAuthStore } from '../stores/authStore'
import './UserManagement.css'

const { Option } = Select

interface User {
  id: number
  username: string
  email: string
  role: 'user' | 'admin'
  avatar?: string
  created_at: string
  updated_at: string
}

const UserManagement: React.FC = () => {
  const { user: currentUser } = useAuthStore()
  const queryClient = useQueryClient()
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [searchText, setSearchText] = useState('')
  const [createForm] = Form.useForm()
  const [editForm] = Form.useForm()

  // 获取用户列表
  const { data: usersData, isLoading, refetch } = useQuery(
    ['users', searchText],
    () => userApi.getUsers({ search: searchText || undefined }),
    {
      keepPreviousData: true
    }
  )

  // 创建用户
  const createUserMutation = useMutation(
    (data: any) => userApi.createUser(data),
    {
      onSuccess: () => {
        message.success('用户创建成功')
        setCreateModalVisible(false)
        createForm.resetFields()
        refetch()
      },
      onError: (error: any) => {
        message.error(error.response?.data?.error || '创建失败')
      }
    }
  )

  // 更新用户
  const updateUserMutation = useMutation(
    ({ id, data }: { id: number; data: any }) => userApi.updateUser(id, data),
    {
      onSuccess: () => {
        message.success('用户信息更新成功')
        setEditModalVisible(false)
        setEditingUser(null)
        editForm.resetFields()
        refetch()
      },
      onError: (error: any) => {
        message.error(error.response?.data?.error || '更新失败')
      }
    }
  )

  // 删除用户
  const deleteUserMutation = useMutation(
    (id: number) => userApi.deleteUser(id),
    {
      onSuccess: () => {
        message.success('用户删除成功')
        refetch()
      },
      onError: (error: any) => {
        message.error(error.response?.data?.error || '删除失败')
      }
    }
  )

  // 重置密码
  const resetPasswordMutation = useMutation(
    ({ id, password }: { id: number; password: string }) => 
      userApi.resetPassword(id, password),
    {
      onSuccess: () => {
        message.success('密码重置成功')
      },
      onError: (error: any) => {
        message.error(error.response?.data?.error || '密码重置失败')
      }
    }
  )

  const handleCreateUser = (values: any) => {
    createUserMutation.mutate(values)
  }

  const handleEditUser = (user: User) => {
    setEditingUser(user)
    editForm.setFieldsValue({
      email: user.email,
      role: user.role
    })
    })
    setEditModalVisible(true)
  }

  const handleUpdateUser = (values: any) => {
    if (!editingUser) return
    updateUserMutation.mutate({
      id: editingUser.id,
      data: values
    })
  }

  const handleResetPassword = (userId: number) => {
    const newPassword = prompt('请输入新密码（至少6个字符）:')
    if (newPassword && newPassword.length >= 6) {
      resetPasswordMutation.mutate({
        id: userId,
        password: newPassword
      })
    } else if (newPassword) {
      message.error('密码至少需要6个字符')
    }
  }

  const columns = [
    {
      title: '用户',
      key: 'user',
      render: (_, record: User) => (
        <div className="user-info">
          <Avatar 
            size={40} 
            src={record.avatar} 
            icon={<UserOutlined />}
            className="user-avatar"
          />
          <div className="user-details">
            <div className="user-name">{record.username}</div>
            <div className="user-email">{record.email}</div>
          </div>
        </div>
      )
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (role: string) => (
        <Tag color={role === 'admin' ? 'red' : 'blue'}>
          {role === 'admin' ? '管理员' : '普通用户'}
        </Tag>
      )
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (date: string) => new Date(date).toLocaleString()
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_, record: User) => (
        <Space>
          <Tooltip title="编辑">
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              onClick={() => handleEditUser(record)}
            />
          </Tooltip>
          
          <Tooltip title="重置密码">
            <Button 
              type="text" 
              onClick={() => handleResetPassword(record.id)}
            >
              重置密码
            </Button>
          </Tooltip>
          
          {record.id !== currentUser?.id && (
            <Popconfirm
              title="确定要删除这个用户吗？"
              description="删除后该用户的所有数据将被永久删除"
              onConfirm={() => deleteUserMutation.mutate(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Tooltip title="删除">
                <Button 
                  type="text" 
                  icon={<DeleteOutlined />} 
                  danger
                />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ]

  return (
    <div className="user-management">
      <div className="user-management-header">
        <div className="header-left">
          <h2>用户管理</h2>
          <p>管理系统用户和权限</p>
        </div>
        
        <div className="header-right">
          <Input.Search
            placeholder="搜索用户..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 200 }}
            allowClear
          />
          
          <Button 
            icon={<ReloadOutlined />} 
            onClick={() => refetch()}
          />
          
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            添加用户
          </Button>
        </div>
      </div>

      <Card className="users-card">
        <Table
          columns={columns}
          dataSource={usersData?.users || []}
          loading={isLoading}
          rowKey="id"
          pagination={{
            total: usersData?.pagination?.total || 0,
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
          }}
        />
      </Card>

      {/* 创建用户模态框 */}
      <Modal
        title="创建用户"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreateUser}
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, message: '用户名至少3个字符' }
            ]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>
          
          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '邮箱格式不正确' }
            ]}
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>
          
          <Form.Item
            name="password"
            label="密码"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6个字符' }
            ]}
          >
            <Input.Password placeholder="请输入密码" />
          </Form.Item>
          
          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select placeholder="请选择角色">
              <Option value="user">普通用户</Option>
              <Option value="admin">管理员</Option>
            </Select>
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit"
                loading={createUserMutation.isLoading}
              >
                创建
              </Button>
              <Button onClick={() => setCreateModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑用户模态框 */}
      <Modal
        title="编辑用户"
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleUpdateUser}
        >
          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '邮箱格式不正确' }
            ]}
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>
          
          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select placeholder="请选择角色">
              <Option value="user">普通用户</Option>
              <Option value="admin">管理员</Option>
            </Select>
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit"
                loading={updateUserMutation.isLoading}
              >
                保存
              </Button>
              <Button onClick={() => setEditModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default UserManagement
