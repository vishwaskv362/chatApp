export interface User {
  id: number
  username: string
  email: string
  is_online: boolean
  created_at: string
}

export interface Message {
  id: string
  sender_id: number
  receiver_id: number
  content: string
  timestamp: string
  is_read: boolean
  sender_username?: string
  reactions?: Record<string, string> // { userId: emoji }
}

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
}

export interface WebSocketMessage {
  type: 'message' | 'message_sent' | 'typing_indicator' | 'user_status' | 'read_receipt' | 'reaction'
  id?: string
  sender_id?: number
  sender_username?: string
  receiver_id?: number
  content?: string
  timestamp?: string
  is_read?: boolean
  is_typing?: boolean
  user_id?: number
  is_online?: boolean
  message_id?: string
  reader_id?: number
  emoji?: string | null
  reactions?: Record<string, string>
}
