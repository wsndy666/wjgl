import React, { useEffect, useState } from 'react'
import { Card, Row, Col, Statistic, List, Avatar, Typography, Spin } from 'antd'
import { 
  FileOutlined, 
  FolderOutlined, 
  UserOutlined, 
  CloudOutlined,
  ClockCircleOutlined,
  DownloadOutlined
} from '@ant-design/icons'
import { useQuery } from 'react-query'
import { userApi } from '../services/api'
import { useAuthStore } from '../stores/authStore'
import './Dashboard.css'

const { Title, Text } = Typography

interface Stats {
  total_users: number
  total_files: number
  total_folders: number
  total_size: number
  new_users_30d: number
  new_files_30d: number
}

interface Activity {
  id: number
  action: string
  target_type: string
  target_id: number
  details: string
  username: string
  created_at: string
}

const Dashboard: React.FC = () => {
  const { user } = useAuthStore()
  const [userStats, setUserStats] = useState<any>(null)

  // 获取系统统计信息（仅管理员）
  const { data: systemStats, isLoading: systemStatsLoading } = useQuery(
    'systemStats',
    () => userApi.getStats(),
    {
      enabled: user?.role === 'admin',
      refetchInterval: 30000 // 30秒刷新一次
    }
  )

  // 获取用户统计信息
  const { data: userData, isLoading: userDataLoading } = useQuery(
    'userData',
    () => userApi.getUser(user?.id || 0),
    {
      enabled: !!user?.id,
      refetchInterval: 30000
    }
  )

  useEffect(() => {
    if (userData) {
      setUserStats(userData.user?.stats)
    }
  }, [userData])

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getActionText = (action: string, targetType: string) => {
    const actionMap: { [key: string]: string } = {
      'upload': '上传了',
      'download': '下载了',
      'delete': '删除了',
      'create': '创建了',
      'update': '更新了',
      'move': '移动了'
    }
    
    const typeMap: { [key: string]: string } = {
      'file': '文件',
      'folder': '文件夹',
      'user': '用户'
    }
    
    return `${actionMap[action] || action}${typeMap[targetType] || targetType}`
  }

  if (systemStatsLoading || userDataLoading) {
    return (
      <div className="dashboard-loading">
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <Title level={2}>欢迎回来，{user?.username}！</Title>
        <Text type="secondary">这是您的文件管理仪表盘</Text>
      </div>

      <Row gutter={[16, 16]} className="dashboard-stats">
        {/* 用户统计 */}
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title="我的文件"
              value={userStats?.file_count || 0}
              prefix={<FileOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title="我的文件夹"
              value={userStats?.folder_count || 0}
              prefix={<FolderOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title="存储使用量"
              value={formatFileSize(userStats?.total_size || 0)}
              prefix={<CloudOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title="最近活动"
              value={userStats?.recent_activity || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 管理员统计 */}
      {user?.role === 'admin' && systemStats && (
        <Row gutter={[16, 16]} className="dashboard-admin-stats">
          <Col span={24}>
            <Title level={4}>系统统计</Title>
          </Col>
          
          <Col xs={24} sm={12} lg={6}>
            <Card className="stat-card admin-stat">
              <Statistic
                title="总用户数"
                value={systemStats.stats?.total_users || 0}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          
          <Col xs={24} sm={12} lg={6}>
            <Card className="stat-card admin-stat">
              <Statistic
                title="总文件数"
                value={systemStats.stats?.total_files || 0}
                prefix={<FileOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          
          <Col xs={24} sm={12} lg={6}>
            <Card className="stat-card admin-stat">
              <Statistic
                title="总文件夹数"
                value={systemStats.stats?.total_folders || 0}
                prefix={<FolderOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          
          <Col xs={24} sm={12} lg={6}>
            <Card className="stat-card admin-stat">
              <Statistic
                title="总存储量"
                value={formatFileSize(systemStats.stats?.total_size || 0)}
                prefix={<CloudOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      <Row gutter={[16, 16]} className="dashboard-content">
        {/* 最近活动 */}
        {user?.role === 'admin' && systemStats?.recentActivity && (
          <Col xs={24} lg={12}>
            <Card title="最近活动" className="activity-card">
              <List
                dataSource={systemStats.recentActivity}
                renderItem={(item: Activity) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar icon={<UserOutlined />} />}
                      title={
                        <Text>
                          <Text strong>{item.username}</Text>
                          {' '}
                          {getActionText(item.action, item.target_type)}
                          {' '}
                          <Text type="secondary">{item.details}</Text>
                        </Text>
                      }
                      description={
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {new Date(item.created_at).toLocaleString()}
                        </Text>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        )}

        {/* 快速操作 */}
        <Col xs={24} lg={12}>
          <Card title="快速操作" className="quick-actions-card">
            <div className="quick-actions">
              <div className="action-item">
                <FileOutlined className="action-icon" />
                <div className="action-content">
                  <Title level={5}>上传文件</Title>
                  <Text type="secondary">快速上传新文件</Text>
                </div>
              </div>
              
              <div className="action-item">
                <FolderOutlined className="action-icon" />
                <div className="action-content">
                  <Title level={5}>创建文件夹</Title>
                  <Text type="secondary">组织您的文件</Text>
                </div>
              </div>
              
              <div className="action-item">
                <DownloadOutlined className="action-icon" />
                <div className="action-content">
                  <Title level={5}>批量下载</Title>
                  <Text type="secondary">下载多个文件</Text>
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Dashboard
