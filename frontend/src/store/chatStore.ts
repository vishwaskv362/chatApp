import { create } from 'zustand'
import type { User, Message } from '../types'

interface ChatState {
  users: User[]
  selectedUser: User | null
  messages: Message[]
  typingUsers: Set<number>
  mutedUsers: Set<number>
  setUsers: (users: User[]) => void
  setSelectedUser: (user: User | null) => void
  setMessages: (messages: Message[]) => void
  addMessage: (message: Message) => void
  updateUserStatus: (userId: number, isOnline: boolean) => void
  setTyping: (userId: number, isTyping: boolean) => void
  markMessageAsRead: (messageId: string) => void
  updateMessageReactions: (messageId: string, reactions: Record<string, string>) => void
  incrementUnreadCount: (userId: number) => void
  resetUnreadCount: (userId: number) => void
  toggleMute: (userId: number) => void
  isMuted: (userId: number) => boolean
}

export const useChatStore = create<ChatState>((set) => ({
  users: [],
  selectedUser: null,
  messages: [],
  typingUsers: new Set(),
  mutedUsers: new Set(JSON.parse(localStorage.getItem('mutedUsers') || '[]')),

  setUsers: (users) => set({ users }),

  setSelectedUser: (user) => set({ selectedUser: user, messages: [] }),

  setMessages: (messages) => set({ messages }),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  updateUserStatus: (userId, isOnline) =>
    set((state) => ({
      users: state.users.map((user) =>
        user.id === userId ? { ...user, is_online: isOnline } : user
      ),
      selectedUser:
        state.selectedUser?.id === userId
          ? { ...state.selectedUser, is_online: isOnline }
          : state.selectedUser,
    })),

  setTyping: (userId, isTyping) =>
    set((state) => {
      const newTypingUsers = new Set(state.typingUsers)
      if (isTyping) {
        newTypingUsers.add(userId)
      } else {
        newTypingUsers.delete(userId)
      }
      return { typingUsers: newTypingUsers }
    }),

  markMessageAsRead: (messageId) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === messageId ? { ...msg, is_read: true } : msg
      ),
    })),

  updateMessageReactions: (messageId: string, reactions: Record<string, string>) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === messageId ? { ...msg, reactions } : msg
      ),
    })),

  incrementUnreadCount: (userId: number) =>
    set((state) => ({
      users: state.users.map((user) =>
        user.id === userId
          ? { ...user, unreadCount: (user.unreadCount || 0) + 1 }
          : user
      ),
    })),

  resetUnreadCount: (userId: number) =>
    set((state) => ({
      users: state.users.map((user) =>
        user.id === userId ? { ...user, unreadCount: 0 } : user
      ),
    })),

  toggleMute: (userId: number) =>
    set((state) => {
      const newMutedUsers = new Set(state.mutedUsers)
      if (newMutedUsers.has(userId)) {
        newMutedUsers.delete(userId)
      } else {
        newMutedUsers.add(userId)
      }
      localStorage.setItem('mutedUsers', JSON.stringify([...newMutedUsers]))
      return { mutedUsers: newMutedUsers }
    }),

  isMuted: (userId: number) => {
    const state = useChatStore.getState()
    return state.mutedUsers.has(userId)
  },
}))
