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
    
    return Promise.reject(error)
  }
)

// 认证相关API
export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }).then(res => res.data),
  
  register: (data: { username: string; email: string; password: string }) =>
    api.post('/auth/register', data).then(res => res.data),
  
  getCurrentUser: () =>
    api.get('/auth/me').then(res => res.data.user),
  
  updateProfile: (data: any) =>
    api.put('/auth/profile', data).then(res => res.data),
  
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put('/auth/password', data).then(res => res.data),
  
  logout: () =>
    api.post('/auth/logout').then(res => res.data)
}

// 文件相关API
export const fileApi = {
  getFiles: (params?: any) =>
    api.get('/files', { params }).then(res => res.data),
  
  uploadFile: (file: File, data?: any) => {
    const formData = new FormData()
    formData.append('file', file)
    if (data) {
      Object.keys(data).forEach(key => {
        formData.append(key, data[key])
      })
    }
    return api.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data)
  },
  
  uploadFiles: (files: File[], data?: any) => {
    const formData = new FormData()
    files.forEach(file => {
      formData.append('files', file)
    })
    if (data) {
      Object.keys(data).forEach(key => {
        formData.append(key, data[key])
      })
    }
    return api.post('/files/upload/batch', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data)
  },
  
  downloadFile: (id: number) =>
    api.get(`/files/${id}/download`, { responseType: 'blob' }),
  
  downloadFiles: (fileIds: number[]) =>
    api.post('/files/download/batch', { fileIds }, { responseType: 'blob' }),
  
  updateFile: (id: number, data: any) =>
    api.put(`/files/${id}`, data).then(res => res.data),
  
  lockFile: (id: number, isLocked: boolean) =>
    api.put(`/files/${id}/lock`, { is_locked: isLocked }).then(res => res.data),
  
  deleteFile: (id: number) =>
    api.delete(`/files/${id}`).then(res => res.data),
  
  deleteFiles: (fileIds: number[]) =>
    api.delete('/files/batch', { data: { fileIds } }).then(res => res.data)
}

// 文件夹相关API
export const folderApi = {
  getFolders: (params?: any) =>
    api.get('/folders', { params }).then(res => res.data),
  
  getFolderTree: () =>
    api.get('/folders/tree').then(res => res.data),
  
  createFolder: (data: { name: string; parent_id?: number }) =>
    api.post('/folders', data).then(res => res.data),
  
  updateFolder: (id: number, data: { name: string }) =>
    api.put(`/folders/${id}`, data).then(res => res.data),
  
  moveFolder: (id: number, parentId?: number) =>
    api.put(`/folders/${id}/move`, { parent_id: parentId }).then(res => res.data),
  
  deleteFolder: (id: number) =>
    api.delete(`/folders/${id}`).then(res => res.data)
}

// 搜索相关API
export const searchApi = {
  search: (params: any) =>
    api.get('/search', { params }).then(res => res.data),
  
  advancedSearch: (data: any) =>
    api.post('/search/advanced', data).then(res => res.data),
  
  getSuggestions: (query: string) =>
    api.get('/search/suggestions', { params: { q: query } }).then(res => res.data),
  
  getPopularSearches: (limit = 10) =>
    api.get('/search/popular', { params: { limit } }).then(res => res.data)
}

// 用户相关API
export const userApi = {
  getUsers: (params?: any) =>
    api.get('/users', { params }).then(res => res.data),
  
  getUser: (id: number) =>
    api.get(`/users/${id}`).then(res => res.data),
  
  createUser: (data: any) =>
    api.post('/users', data).then(res => res.data),
  
  updateUser: (id: number, data: any) =>
    api.put(`/users/${id}`, data).then(res => res.data),
  
  resetPassword: (id: number, password: string) =>
    api.put(`/users/${id}/password`, { password }).then(res => res.data),
  
  deleteUser: (id: number) =>
    api.delete(`/users/${id}`).then(res => res.data),
  
  getUserLogs: (id: number, params?: any) =>
    api.get(`/users/${id}/logs`, { params }).then(res => res.data),
  
  getStats: () =>
    api.get('/users/stats/overview').then(res => res.data)
}

export default api
