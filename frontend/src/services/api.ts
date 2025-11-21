import axios from 'axios'
import type { User, LoginRequest, RegisterRequest, AuthResponse, Message } from '../types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_URL,
})

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const authAPI = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/api/auth/login', data)
    return response.data
  },

  register: async (data: RegisterRequest): Promise<User> => {
    const response = await api.post<User>('/api/auth/register', data)
    return response.data
  },

  logout: async (): Promise<void> => {
    await api.post('/api/auth/logout')
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<User>('/api/auth/me')
    return response.data
  },
}

export const usersAPI = {
  getAllUsers: async (): Promise<User[]> => {
    const response = await api.get<User[]>('/api/users/')
    return response.data
  },

  getUser: async (userId: number): Promise<User> => {
    const response = await api.get<User>(`/api/users/${userId}`)
    return response.data
  },
}

export const messagesAPI = {
  getHistory: async (userId: number, limit: number = 50): Promise<Message[]> => {
    const response = await api.get<Message[]>(`/api/messages/history/${userId}`, {
      params: { limit },
    })
    return response.data
  },

  markAsRead: async (messageId: string): Promise<void> => {
    await api.patch(`/api/messages/${messageId}/read`)
  },
}

export default api
