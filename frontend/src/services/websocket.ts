import type { WebSocketMessage } from '../types'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'

class WebSocketService {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 3000
  private messageHandlers: Set<(message: WebSocketMessage) => void> = new Set()

  connect(token: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return
    }

    this.ws = new WebSocket(`${WS_URL}/ws?token=${token}`)

    this.ws.onopen = () => {
      console.log('WebSocket connected')
      this.reconnectAttempts = 0
    }

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data)
        console.log('Received WebSocket message:', message)
        this.messageHandlers.forEach((handler) => handler(message))
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
      }
    }

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    this.ws.onclose = () => {
      console.log('WebSocket disconnected')
      this.attemptReconnect(token)
    }
  }

  private attemptReconnect(token: string) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
      setTimeout(() => {
        this.connect(token)
      }, this.reconnectDelay)
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.messageHandlers.clear()
  }

  sendMessage(receiverId: number, content: string) {
    console.log('Sending message via WebSocket:', { receiverId, content, wsState: this.ws?.readyState })
    if (this.ws?.readyState === WebSocket.OPEN) {
      const payload = {
        type: 'message',
        receiver_id: receiverId,
        content,
      }
      console.log('WebSocket is open, sending:', payload)
      this.ws.send(JSON.stringify(payload))
    } else {
      console.error('WebSocket is not open! State:', this.ws?.readyState)
    }
  }

  sendTypingIndicator(receiverId: number, isTyping: boolean) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'typing',
          receiver_id: receiverId,
          is_typing: isTyping,
        })
      )
    }
  }

  sendReadReceipt(messageId: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'read_receipt',
          message_id: messageId,
        })
      )
    }
  }

  sendReaction(messageId: string, emoji: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'reaction',
          message_id: messageId,
          emoji: emoji,
        })
      )
    }
  }

  onMessage(handler: (message: WebSocketMessage) => void) {
    this.messageHandlers.add(handler)
    return () => {
      this.messageHandlers.delete(handler)
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}

export const wsService = new WebSocketService()
