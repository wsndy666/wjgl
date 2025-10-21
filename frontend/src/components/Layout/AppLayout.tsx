import React, { useState } from 'react'
import { Layout, Menu, Avatar, Dropdown, Button, Drawer } from 'antd'
import {
  DashboardOutlined,
  FolderOutlined,
  SearchOutlined,
  SettingOutlined,
  UserOutlined,
  MenuOutlined,
  LogoutOutlined,
  BellOutlined
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import './AppLayout.css'

const { Header, Sider, Content } = Layout

interface AppLayoutProps {
  children: React.ReactNode
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false)
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '仪表盘'
    },
    {
      key: '/files',
      icon: <FolderOutlined />,
      label: '文件管理'
    },
    {
      key: '/search',
      icon: <SearchOutlined />,
      label: '搜索'
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '设置'
    }
  ]

  // 管理员菜单
  if (user?.role === 'admin') {
    menuItems.push({
      key: '/users',
      icon: <UserOutlined />,
      label: '用户管理'
    })
  }

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key)
    setMobileMenuVisible(false)
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人资料'
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '账户设置'
    },
    {
      type: 'divider' as const
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout
    }
  ]

  const isMobile = window.innerWidth <= 768

  return (
    <Layout className="app-layout">
      {/* 移动端头部 */}
      {isMobile && (
        <Header className="mobile-header">
          <div className="mobile-header-content">
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setMobileMenuVisible(true)}
              className="mobile-menu-button"
            />
            <div className="mobile-header-title">文件管理系统</div>
            <div className="mobile-header-actions">
              <Button type="text" icon={<BellOutlined />} />
              <Dropdown
                menu={{ items: userMenuItems }}
                placement="bottomRight"
                trigger={['click']}
              >
                <Avatar size="small" icon={<UserOutlined />} />
              </Dropdown>
            </div>
          </div>
        </Header>
      )}

      {/* 桌面端侧边栏 */}
      {!isMobile && (
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          className="app-sider"
          width={240}
          collapsedWidth={80}
        >
          <div className="sider-header">
            <div className="logo">
              {collapsed ? 'FM' : '文件管理系统'}
            </div>
          </div>
          
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={handleMenuClick}
            className="sider-menu"
          />
        </Sider>
      )}

      {/* 移动端抽屉菜单 */}
      <Drawer
        title="菜单"
        placement="left"
        onClose={() => setMobileMenuVisible(false)}
        open={mobileMenuVisible}
        className="mobile-drawer"
        width={240}
      >
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          className="mobile-menu"
        />
      </Drawer>

      <Layout className="app-main">
        {/* 桌面端头部 */}
        {!isMobile && (
          <Header className="app-header">
            <div className="header-left">
              <div className="breadcrumb">
                {location.pathname === '/dashboard' && '仪表盘'}
                {location.pathname === '/files' && '文件管理'}
                {location.pathname === '/search' && '搜索'}
                {location.pathname === '/settings' && '设置'}
                {location.pathname === '/users' && '用户管理'}
              </div>
            </div>
            
            <div className="header-right">
              <Button type="text" icon={<BellOutlined />} className="header-action" />
              
              <Dropdown
                menu={{ items: userMenuItems }}
                placement="bottomRight"
                trigger={['click']}
              >
                <div className="user-info">
                  <Avatar size="small" icon={<UserOutlined />} />
                  <span className="username">{user?.username}</span>
                </div>
              </Dropdown>
            </div>
          </Header>
        )}

        <Content className="app-content">
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}

export default AppLayout
