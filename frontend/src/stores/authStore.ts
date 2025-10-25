import { create } from 'zustand'

// 定义用户类型
export interface User {
  id: number
  username: string
  email: string
  avatar?: string
  role: string
  createdAt: string
}

// 定义认证状态类型
interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

// 定义认证操作类型
interface AuthActions {
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  updateProfile: (data: Partial<User>) => Promise<void>
  checkAuth: () => Promise<boolean>
}

// 定义完整的store类型
type AuthStore = AuthState & AuthActions

// 初始状态
const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null
}

// 创建store并导出
const useAuthStore = create<AuthStore>((set, get) => ({
  ...initialState,
  
  // 登录操作
  login: async (username: string, password: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })
      
      if (!response.ok) {
        throw new Error('登录失败')
      }
      
      const data = await response.json()
      set({
        user: data.user,
        token: data.token,
        isAuthenticated: true
      })
      
      // 只在浏览器环境中设置localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('auth-storage', JSON.stringify({
          state: {
            user: data.user,
            token: data.token
          }
        }))
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '登录失败' })
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  // 登出操作
  logout: () => {
    set({
      user: null,
      token: null,
      isAuthenticated: false
    })
    
    // 只在浏览器环境中清除localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('auth-storage')
    }
  },

  // 更新用户资料
  updateProfile: async (data: Partial<User>) => {
    set({ isLoading: true, error: null })
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${get().token}`,
        },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        throw new Error('更新资料失败')
      }
      
      const updatedData = await response.json()
      set({ user: updatedData.user })
      
      // 只在浏览器环境中更新localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        const storedData = localStorage.getItem('auth-storage')
        if (storedData) {
          const parsedData = JSON.parse(storedData)
          parsedData.state.user = updatedData.user
          localStorage.setItem('auth-storage', JSON.stringify(parsedData))
        }
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '更新资料失败' })
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  // 检查认证状态
  checkAuth: async () => {
    set({ isLoading: true })
    try {
      // 先尝试从localStorage恢复状态（只在浏览器环境中）
      if (typeof window !== 'undefined' && window.localStorage) {
        const storedData = localStorage.getItem('auth-storage')
        if (storedData) {
          try {
            const parsedData = JSON.parse(storedData)
            if (parsedData.state?.token) {
              set({
                token: parsedData.state.token,
                user: parsedData.state.user,
                isAuthenticated: true
              })
            }
          } catch (error) {
            console.error('解析认证数据失败:', error)
          }
        }
      }
      
      // 如果有token，验证是否有效
      const token = get().token
      if (token) {
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
        
        if (response.ok) {
          const data = await response.json()
          set({ user: data.user, isAuthenticated: true })
          return true
        } else {
          // token无效，清除认证状态
          set({
            user: null,
            token: null,
            isAuthenticated: false
          })
          
          if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.removeItem('auth-storage')
          }
        }
      }
      
      return get().isAuthenticated
    } catch (error) {
      console.error('检查认证状态失败:', error)
      set({
        user: null,
        token: null,
        isAuthenticated: false
      })
      return false
    } finally {
      set({ isLoading: false })
    }
  }
}))

export default useAuthStore