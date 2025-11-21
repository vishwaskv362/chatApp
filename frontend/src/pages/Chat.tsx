import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useChatStore } from '../store/chatStore'
import { useThemeStore } from '../store/themeStore'
import { authAPI, usersAPI, messagesAPI } from '../services/api'
import { wsService } from '../services/websocket'
import EmojiPicker from '../components/EmojiPicker'
import ReactionPicker from '../components/ReactionPicker'
import type { User, Message, WebSocketMessage } from '../types'

export default function Chat() {
  const navigate = useNavigate()
  const { token, user, clearAuth, updateUser } = useAuthStore()
  const { isDarkMode, toggleTheme } = useThemeStore()
  const {
    users,
    selectedUser,
    messages,
    typingUsers,
    setUsers,
    setSelectedUser,
    setMessages,
    addMessage,
    updateUserStatus,
    setTyping,
    markMessageAsRead,
    updateMessageReactions,
  } = useChatStore()

  const [messageInput, setMessageInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageInputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    const initializeChat = async () => {
      if (!token) {
        navigate('/login')
        return
      }

      try {
        // Fetch current user if not already loaded
        if (!user) {
          const currentUser = await authAPI.getCurrentUser()
          updateUser(currentUser)
        }
        
        await loadUsers()
        connectWebSocket()
      } catch (error) {
        console.error('Failed to initialize chat:', error)
        // Token might be invalid, redirect to login
        clearAuth()
        navigate('/login')
      } finally {
        setLoading(false)
      }
    }

    initializeChat()

    return () => {
      wsService.disconnect()
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (selectedUser) {
      loadMessageHistory(selectedUser.id)
    }
  }, [selectedUser])

  // Re-register WebSocket handler when user or selectedUser changes
  useEffect(() => {
    if (!token) return
    
    const unsubscribe = wsService.onMessage(handleWebSocketMessage)
    return unsubscribe
  }, [user, selectedUser])

  const loadUsers = async () => {
    try {
      const allUsers = await usersAPI.getAllUsers()
      setUsers(allUsers)
    } catch (error) {
      console.error('Failed to load users:', error)
      throw error // Re-throw to handle in initializeChat
    }
  }

  const loadMessageHistory = async (userId: number) => {
    try {
      const history = await messagesAPI.getHistory(userId)
      setMessages(history)
    } catch (error) {
      console.error('Failed to load message history:', error)
    }
  }

  const connectWebSocket = () => {
    if (!token) return

    wsService.connect(token)
    // Message handler is registered in useEffect that depends on user and selectedUser
  }

  const handleWebSocketMessage = (message: WebSocketMessage) => {
    console.log('handleWebSocketMessage called:', { 
      messageType: message.type, 
      message,
      currentUser: user?.id,
      selectedUser: selectedUser?.id 
    })
    
    switch (message.type) {
      case 'message':
        // Show message if it's from the selected user OR to the selected user
        const isMessageForCurrentChat = 
          (message.sender_id === selectedUser?.id && message.receiver_id === user?.id) ||
          (message.receiver_id === selectedUser?.id && message.sender_id === user?.id)
        
        console.log('Message check:', {
          isMessageForCurrentChat,
          condition1: message.sender_id === selectedUser?.id && message.receiver_id === user?.id,
          condition2: message.receiver_id === selectedUser?.id && message.sender_id === user?.id,
          messageSenderId: message.sender_id,
          messageReceiverId: message.receiver_id,
          selectedUserId: selectedUser?.id,
          currentUserId: user?.id
        })
        
        if (isMessageForCurrentChat) {
          addMessage({
            id: message.id!,
            sender_id: message.sender_id!,
            receiver_id: message.receiver_id!,
            content: message.content!,
            timestamp: message.timestamp!,
            is_read: message.is_read || false,
            sender_username: message.sender_username,
          })

          // Send read receipt if we received a message (not sent by us)
          if (message.receiver_id === user?.id && message.sender_id !== user?.id) {
            wsService.sendReadReceipt(message.id!)
          }
        }
        break

      case 'message_sent':
        // Confirmation that our message was sent - add to UI
        if (message.sender_id === user?.id && message.receiver_id === selectedUser?.id) {
          addMessage({
            id: message.id!,
            sender_id: message.sender_id!,
            receiver_id: message.receiver_id!,
            content: message.content!,
            timestamp: message.timestamp!,
            is_read: message.is_read || false,
            sender_username: message.sender_username,
          })
        }
        break

      case 'typing_indicator':
        if (message.sender_id === selectedUser?.id) {
          setTyping(message.sender_id, message.is_typing || false)
        }
        break

      case 'user_status':
        updateUserStatus(message.user_id!, message.is_online!)
        break

      case 'read_receipt':
        markMessageAsRead(message.message_id!)
        break

      case 'reaction':
        if (message.message_id && message.reactions) {
          updateMessageReactions(message.message_id, message.reactions)
        }
        break
    }
  }

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedUser) return

    wsService.sendMessage(selectedUser.id, messageInput.trim())
    setMessageInput('')

    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    wsService.sendTypingIndicator(selectedUser.id, false)
  }

  const handleInputChange = (value: string) => {
    setMessageInput(value)

    if (!selectedUser) return

    // Send typing indicator
    wsService.sendTypingIndicator(selectedUser.id, true)

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      wsService.sendTypingIndicator(selectedUser.id, false)
    }, 2000)
  }

  const handleLogout = async () => {
    try {
      await authAPI.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      wsService.disconnect()
      clearAuth()
      localStorage.removeItem('token')
      navigate('/login')
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  const handleEmojiSelect = (emoji: string) => {
    setMessageInput((prev: string) => prev + emoji)
    messageInputRef.current?.focus()
  }

  const handleReaction = (messageId: string, emoji: string) => {
    wsService.sendReaction(messageId, emoji)
    setShowReactionPicker(null)
  }

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className={`text-xl ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Loading...</div>
      </div>
    )
  }

  return (
    <div className={`h-screen flex ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
      {/* Sidebar - User List */}
      <div className={`w-80 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-r flex flex-col`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-700 bg-gradient-to-r from-blue-600 to-purple-600">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">{user?.username}</h2>
              <p className="text-sm text-blue-100">Online</p>
            </div>
            <div className="flex items-center space-x-2">
              {/* Dark Mode Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition"
                title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDarkMode ? '☀️' : '🌙'}
              </button>
              <button
                onClick={handleLogout}
                className="px-3 py-1 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            <h3 className={`px-3 py-2 text-xs font-semibold uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Users ({users.length})
            </h3>
            {users.length === 0 ? (
              <p className={`px-3 py-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>No users available</p>
            ) : (
              users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setSelectedUser(u)}
                  className={`w-full p-3 flex items-center space-x-3 rounded-lg transition ${
                    selectedUser?.id === u.id
                      ? isDarkMode 
                        ? 'bg-gray-700 border-l-4 border-blue-500' 
                        : 'bg-blue-50 border-l-4 border-blue-600'
                      : isDarkMode
                        ? 'hover:bg-gray-700'
                        : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {u.username[0].toUpperCase()}
                    </div>
                    <div
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 ${isDarkMode ? 'border-gray-800' : 'border-white'} ${
                        u.is_online ? 'bg-green-500' : 'bg-gray-400'
                      }`}
                    />
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{u.username}</p>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {u.is_online ? 'Online' : 'Offline'}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className={`p-4 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b flex items-center space-x-3`}>
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                  {selectedUser.username[0].toUpperCase()}
                </div>
                <div
                  className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 ${isDarkMode ? 'border-gray-800' : 'border-white'} ${
                    selectedUser.is_online ? 'bg-green-500' : 'bg-gray-400'
                  }`}
                />
              </div>
              <div>
                <h2 className={`font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{selectedUser.username}</h2>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {selectedUser.is_online ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isOwn = msg.sender_id === user?.id
                  const reactions = msg.reactions || {}
                  const reactionCounts: Record<string, number> = {}
                  
                  // Count reactions
                  Object.values(reactions).forEach((emoji) => {
                    reactionCounts[emoji] = (reactionCounts[emoji] || 0) + 1
                  })

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}
                    >
                      <div className="relative">
                        <div
                          className={`max-w-xs lg:max-w-md xl:max-w-lg px-4 py-2 rounded-lg ${
                            isOwn
                              ? 'bg-blue-600 text-white'
                              : isDarkMode
                                ? 'bg-gray-800 text-gray-100 border border-gray-700'
                                : 'bg-white text-gray-900 border border-gray-200'
                          }`}
                        >
                          <p className="break-words">{msg.content}</p>
                          <div className="flex items-center justify-end mt-1 space-x-1">
                            <p
                              className={`text-xs ${
                                isOwn ? 'text-blue-100' : 'text-gray-500'
                              }`}
                            >
                              {formatTime(msg.timestamp)}
                            </p>
                            {isOwn && (
                              <span className="text-xs text-blue-100">
                                {msg.is_read ? '✓✓' : '✓'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Reactions */}
                        {Object.keys(reactionCounts).length > 0 && (
                          <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                            {Object.entries(reactionCounts).map(([emoji, count]) => (
                              <button
                                key={emoji}
                                onClick={() => handleReaction(msg.id, emoji)}
                                className={`px-2 py-0.5 rounded-full text-sm border ${
                                  reactions[String(user?.id)] === emoji
                                    ? 'bg-blue-100 border-blue-300'
                                    : 'bg-gray-100 border-gray-300'
                                } hover:scale-110 transition-transform`}
                              >
                                {emoji} {count > 1 && count}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Reaction Button */}
                        <button
                          onClick={() => setShowReactionPicker(showReactionPicker === msg.id ? null : msg.id)}
                          className="absolute -bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-gray-300 rounded-full p-1 hover:bg-gray-50 text-sm"
                          title="Add reaction"
                        >
                          😊
                        </button>

                        {/* Reaction Picker */}
                        {showReactionPicker === msg.id && (
                          <div className="absolute bottom-8 right-0">
                            <ReactionPicker
                              onReactionSelect={(emoji) => handleReaction(msg.id, emoji)}
                              show={true}
                              onClose={() => setShowReactionPicker(null)}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
              
              {/* Typing Indicator */}
              {typingUsers.has(selectedUser.id) && (
                <div className="flex justify-start">
                  <div className={`px-4 py-2 rounded-lg border ${
                    isDarkMode 
                      ? 'bg-gray-800 text-gray-400 border-gray-700' 
                      : 'bg-white text-gray-500 border-gray-200'
                  }`}>
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className={`p-4 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-t`}>
              <div className="flex items-center space-x-2">
                <EmojiPicker onEmojiSelect={handleEmojiSelect} />
                <input
                  ref={messageInputRef}
                  type="text"
                  value={messageInput}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a message..."
                  className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 focus:border-transparent'
                  }`}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
                >
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className={`flex-1 flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <div className="text-center">
              <div className="text-6xl mb-4">💬</div>
              <h2 className={`text-2xl font-semibold mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                Welcome to Chat System
              </h2>
              <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Select a user to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
