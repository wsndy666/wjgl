import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from 'antd'
import useAuthStore from './stores/authStore'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import FileManager from './pages/FileManager'
import Search from './pages/Search'
import Settings from './pages/Settings'
import UserManagement from './pages/UserManagement'
import AppLayout from './components/Layout/AppLayout'
import Loading from './components/Common/Loading'

const { Content } = Layout

function App() {
  const { isAuthenticated, isLoading } = useAuthStore()

  if (isLoading) {
    return <Loading />
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/files" element={<FileManager />} />
        <Route path="/search" element={<Search />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/users" element={<UserManagement />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppLayout>
  )
}

export default App
