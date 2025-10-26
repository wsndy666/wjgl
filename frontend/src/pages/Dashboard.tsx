import React, { useState, useEffect } from 'react'
import { Card, Row, Col, Statistic, List, Avatar, Typography, Spin, Button } from 'antd'
import { 
  FileOutlined, 
  FolderOutlined, 
  UserOutlined, 
  CloudOutlined,
  ClockCircleOutlined,
  DownloadOutlined,
  UploadOutlined,
  PlusOutlined
} from '@ant-design/icons'
import { useQuery } from 'react-query'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../stores/authStore'
import './Dashboard.css'

const { Title, Text } = Typography

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
  const navigate = useNavigate()

  // 获取仪表盘统计数据
  const { data: dashboardData, isLoading: dashboardLoading, refetch: refetchStats } = useQuery(
    'dashboardStats',
    async () => {
      const response = await fetch('/api/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-storage')?.replace(/"/g, '')}`
        }
      });
      return response.json();
    },
    {
      enabled: !!user?.id,
      refetchInterval: 10000, // 10秒刷新一次
      refetchOnWindowFocus: true,
      refetchOnMount: true
    }
  )

  // 获取最近活动
  const { data: activityData, isLoading: activityLoading } = useQuery(
    'dashboardActivity',
    async () => {
      const response = await fetch('/api/dashboard/activity', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-storage')?.replace(/"/g, '')}`
        }
      });
      return response.json();
    },
    {
      enabled: !!user?.id,
      refetchInterval: 30000
    }
  )

  useEffect(() => {
    if (dashboardData) {
      setUserStats(dashboardData.userStats)
    }
  }, [dashboardData])

  // 监听文件操作，自动刷新数据
  useEffect(() => {
    const handleFileOperation = () => {
      refetchStats()
    }

    // 监听自定义事件
    window.addEventListener('fileOperationComplete', handleFileOperation)
    
    return () => {
      window.removeEventListener('fileOperationComplete', handleFileOperation)
    }
  }, [refetchStats])

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

  if (dashboardLoading || activityLoading) {
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
              value={userStats?.total_files || 0}
              prefix={<FileOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title="我的文件夹"
              value={userStats?.total_folders || 0}
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
      {user?.role === 'admin' && dashboardData?.systemStats && (
        <Row gutter={[16, 16]} className="dashboard-admin-stats">
          <Col span={24}>
            <Title level={4}>系统统计</Title>
          </Col>
          
          <Col xs={24} sm={12} lg={6}>
            <Card className="stat-card admin-stat">
              <Statistic
                title="总用户数"
                value={dashboardData.systemStats?.total_users || 0}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          
          <Col xs={24} sm={12} lg={6}>
            <Card className="stat-card admin-stat">
              <Statistic
                title="总文件数"
                value={dashboardData.systemStats?.total_files || 0}
                prefix={<FileOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          
          <Col xs={24} sm={12} lg={6}>
            <Card className="stat-card admin-stat">
              <Statistic
                title="总文件夹数"
                value={dashboardData.systemStats?.total_folders || 0}
                prefix={<FolderOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          
          <Col xs={24} sm={12} lg={6}>
            <Card className="stat-card admin-stat">
              <Statistic
                title="总存储量"
                value={formatFileSize(dashboardData.systemStats?.total_size || 0)}
                prefix={<CloudOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      <Row gutter={[16, 16]} className="dashboard-content">
        {/* 最近活动 */}
        {user?.role === 'admin' && activityData?.activities && (
          <Col xs={24} lg={12}>
            <Card title="最近活动" className="activity-card">
              <List
                dataSource={activityData?.activities || []}
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

        {/* 系统信息 */}
        <Col xs={24} lg={12}>
          <Card title="系统信息" className="system-info-card">
            <div className="system-info">
              <div className="info-item">
                <Text strong>系统版本：</Text>
                <Text>v1.0.0</Text>
              </div>
              <div className="info-item">
                <Text strong>最后更新：</Text>
                <Text>{new Date().toLocaleDateString()}</Text>
              </div>
              <div className="info-item">
                <Text strong>存储状态：</Text>
                <Text type="success">正常</Text>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Dashboard
