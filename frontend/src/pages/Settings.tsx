import React, { useState } from 'react'
import { Card, Form, Input, Button, Avatar, Upload, Switch, message, Tabs, Divider } from 'antd'
import { UserOutlined, CameraOutlined, LockOutlined, BellOutlined } from '@ant-design/icons'
import { useAuthStore } from '../stores/authStore'
import { authApi } from '../services/api'
import './Settings.css'

const { TabPane } = Tabs

const Settings: React.FC = () => {
  const { user, updateProfile } = useAuthStore()
  const [profileForm] = Form.useForm()
  const [passwordForm] = Form.useForm()
  const [loading, setLoading] = useState(false)

  const handleProfileUpdate = async (values: any) => {
    try {
      setLoading(true)
      await updateProfile(values)
      message.success('个人资料更新成功')
    } catch (error: any) {
      message.error(error.response?.data?.error || '更新失败')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async (values: any) => {
    try {
      setLoading(true)
      await authApi.changePassword(values)
      message.success('密码修改成功')
      passwordForm.resetFields()
    } catch (error: any) {
      message.error(error.response?.data?.error || '密码修改失败')
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarUpload = (info: any) => {
    if (info.file.status === 'done') {
      message.success('头像上传成功')
      updateProfile({ avatar: info.file.response.url })
    } else if (info.file.status === 'error') {
      message.error('头像上传失败')
    }
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h2>设置</h2>
        <p>管理您的账户设置和偏好</p>
      </div>

      <Tabs defaultActiveKey="profile" className="settings-tabs">
        <TabPane tab={<span><UserOutlined />个人资料</span>} key="profile">
          <Card className="settings-card">
            <div className="profile-section">
              <div className="avatar-section">
                <Avatar
                  size={80}
                  src={user?.avatar}
                  icon={<UserOutlined />}
                  className="profile-avatar"
                />
                <Upload
                  name="avatar"
                  action="/api/upload/avatar"
                  headers={{ Authorization: `Bearer ${localStorage.getItem('token')}` }}
                  showUploadList={false}
                  onChange={handleAvatarUpload}
                >
                  <Button icon={<CameraOutlined />} className="avatar-upload-btn">
                    更换头像
                  </Button>
                </Upload>
              </div>
              
              <Form
                form={profileForm}
                layout="vertical"
                initialValues={{
                  username: user?.username,
                  email: user?.email,
                  avatar: user?.avatar
                }}
                onFinish={handleProfileUpdate}
                className="profile-form"
              >
                <Form.Item
                  name="username"
                  label="用户名"
                  rules={[
                    { required: true, message: '请输入用户名' },
                    { min: 3, message: '用户名至少3个字符' }
                  ]}
                >
                  <Input disabled />
                </Form.Item>
                
                <Form.Item
                  name="email"
                  label="邮箱"
                  rules={[
                    { required: true, message: '请输入邮箱' },
                    { type: 'email', message: '邮箱格式不正确' }
                  ]}
                >
                  <Input />
                </Form.Item>
                
                <Form.Item>
                  <Button type="primary" htmlType="submit" loading={loading}>
                    保存更改
                  </Button>
                </Form.Item>
              </Form>
            </div>
          </Card>
        </TabPane>

        <TabPane tab={<span><LockOutlined />安全设置</span>} key="security">
          <Card className="settings-card">
            <Form
              form={passwordForm}
              layout="vertical"
              onFinish={handlePasswordChange}
            >
              <Form.Item
                name="currentPassword"
                label="当前密码"
                rules={[{ required: true, message: '请输入当前密码' }]}
              >
                <Input.Password />
              </Form.Item>
              
              <Form.Item
                name="newPassword"
                label="新密码"
                rules={[
                  { required: true, message: '请输入新密码' },
                  { min: 6, message: '密码至少6个字符' }
                ]}
              >
                <Input.Password />
              </Form.Item>
              
              <Form.Item
                name="confirmPassword"
                label="确认新密码"
                dependencies={['newPassword']}
                rules={[
                  { required: true, message: '请确认新密码' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) {
                        return Promise.resolve()
                      }
                      return Promise.reject(new Error('两次输入的密码不一致'))
                    }
                  })
                ]}
              >
                <Input.Password />
              </Form.Item>
              
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading}>
                  修改密码
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </TabPane>

        <TabPane tab={<span><BellOutlined />通知设置</span>} key="notifications">
          <Card className="settings-card">
            <div className="notification-settings">
              <div className="setting-item">
                <div className="setting-info">
                  <h4>文件上传通知</h4>
                  <p>当文件上传完成时发送通知</p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <Divider />
              
              <div className="setting-item">
                <div className="setting-info">
                  <h4>文件下载通知</h4>
                  <p>当文件下载完成时发送通知</p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <Divider />
              
              <div className="setting-item">
                <div className="setting-info">
                  <h4>系统更新通知</h4>
                  <p>当系统有重要更新时发送通知</p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <Divider />
              
              <div className="setting-item">
                <div className="setting-info">
                  <h4>安全提醒</h4>
                  <p>当检测到异常登录时发送提醒</p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </Card>
        </TabPane>
      </Tabs>
    </div>
  )
}

export default Settings
