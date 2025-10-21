import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi } from '../services/api'

interface User {
  id: number
  username: string
  email: string
  role: 'user' | 'admin'
  avatar?: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  updateProfile: (data: Partial<User>) => Promise<void>
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,

      login: async (username: string, password: string) => {
        try {
          set({ isLoading: true })
          const response = await authApi.login(username, password)
          
          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            isLoading: false
          })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false
        })
      },

      updateProfile: async (data: Partial<User>) => {
        try {
          const { user } = get()
          if (!user) return

          await authApi.updateProfile(data)
          
          set({
            user: { ...user, ...data }
          })
        } catch (error) {
          throw error
        }
      },

      checkAuth: async () => {
        try {
          const { token } = get()
          if (!token) {
            set({ isLoading: false })
            return
          }

          const user = await authApi.getCurrentUser()
          set({
            user,
            isAuthenticated: true,
            isLoading: false
          })
        } catch (error) {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false
          })
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        token: state.token,
        user: state.user 
      })
    }
  )
)
