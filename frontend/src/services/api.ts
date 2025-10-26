import axios, { AxiosInstance, AxiosResponse } from 'axios'
import { message } from 'antd'

// 创建axios实例
const api: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 只在浏览器环境中访问localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      const token = localStorage.getItem('auth-storage')
      if (token) {
        try {
          const authData = JSON.parse(token)
          if (authData.state?.token) {
            config.headers.Authorization = `Bearer ${authData.state.token}`
          }
        } catch (error) {
          console.error('解析token失败:', error)
        }
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  (error) => {
    // 只在浏览器环境中执行window相关操作
    if (typeof window !== 'undefined') {
      if (error.response?.status === 401) {
        // 清除本地存储
        localStorage.removeItem('auth-storage')
        // 重定向到登录页
        window.location.href = '/login'
      } else if (error.response?.status === 403) {
        message.error('权限不足')
      } else if (error.response?.status >= 500) {
        message.error('服务器错误，请稍后重试')
      } else if (error.code === 'ECONNABORTED') {
        message.error('请求超时，请检查网络连接')
      }
    }
    return Promise.reject(error)
  }
)

// 认证相关API
export const authApi = {
  login: async (username: string, password: string) => {
    const response = await api.post('/auth/login', { username, password })
    return response.data
  },
  getCurrentUser: async () => {
    const response = await api.get('/auth/me')
    return response.data
  },
  updateProfile: async (data: any) => {
    const response = await api.put('/auth/profile', data)
    return response.data
  },
  changePassword: async (data: { currentPassword: string; newPassword: string }) => {
    const response = await api.post('/auth/change-password', data)
    return response.data
  }
}

// 文件相关API
export const fileApi = {
  upload: async (file: File, folderId?: number) => {
    const formData = new FormData()
    formData.append('file', file)
    if (folderId) {
      formData.append('folderId', folderId.toString())
    }
    const response = await api.post('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },
  uploadFile: async (file: File, options?: { folderId?: number }) => {
    return fileApi.upload(file, options?.folderId)
  },
  uploadFiles: async (files: File[], options?: { folderId?: number }) => {
    const promises = files.map(file => fileApi.upload(file, options?.folderId))
    return Promise.all(promises)
  },
  getFiles: async (folderId?: number) => {
    const params = folderId ? { folderId } : {}
    const response = await api.get('/files', { params })
    return response.data
  },
  deleteFile: async (fileId: number) => {
    const response = await api.delete(`/files/${fileId}`)
    return response.data
  },
  downloadFiles: async (fileIds: number[]) => {
    const response = await api.post('/files/download', { fileIds })
    return response.data
  },
  downloadFile: async (fileId: number) => {
    const response = await api.get(`/files/${fileId}/download`)
    return response.data
  },
  lockFile: async (fileId: number, isLocked: boolean) => {
    const response = await api.post(`/files/${fileId}/lock`, { isLocked })
    return response.data
  },
  deleteFiles: async (fileIds: number[]) => {
    const response = await api.delete('/files/batch', { data: { fileIds } })
    return response.data
  },
  updateFile: async (fileId: number, data: any) => {
    const response = await api.put(`/files/${fileId}`, data)
    return response.data
  }
}

// 用户相关API
export const userApi = {
  getUsers: async (params?: any) => {
    const response = await api.get('/users', { params })
    return response.data
  },
  createUser: async (data: any) => {
    const response = await api.post('/users', data)
    return response.data
  },
  updateUser: async (id: number, data: any) => {
    const response = await api.put(`/users/${id}`, data)
    return response.data
  },
  deleteUser: async (id: number) => {
    const response = await api.delete(`/users/${id}`)
    return response.data
  },
  resetPassword: async (id: number, password: string) => {
    const response = await api.post(`/users/${id}/reset-password`, { password })
    return response.data
  }
}

// 搜索相关API
export const searchApi = {
  search: async (params: any) => {
    const response = await api.get('/search', { params })
    return response.data
  },
  advancedSearch: async (params: any) => {
    const response = await api.get('/search/advanced', { params })
    return response.data
  },
  getSuggestions: async (query: string) => {
    const response = await api.get('/search/suggestions', { params: { query } })
    return response.data
  },
  getPopularSearches: async (limit: number) => {
    const response = await api.get('/search/popular', { params: { limit } })
    return response.data
  }
}

// 文件夹相关API
export const folderApi = {
  create: async (name: string, parentId?: number) => {
    const response = await api.post('/folders', { name, parentId })
    return response.data
  },
  createFolder: async (data: { name: string; parent_id?: number }) => {
    return folderApi.create(data.name, data.parent_id)
  },
  getFolders: async (parentId?: number) => {
    const params = parentId ? { parentId } : {}
    const response = await api.get('/folders', { params })
    return response.data
  }
}

// 仪表盘相关API
export const dashboardApi = {
  getStats: async () => {
    const response = await api.get('/dashboard/stats')
    return response.data
  },
  getActivity: async () => {
    const response = await api.get('/dashboard/activity')
    return response.data
  }
}

// 导出api实例
export { api }