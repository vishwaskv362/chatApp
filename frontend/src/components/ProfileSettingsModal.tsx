import { useState } from 'react'
import { useThemeStore } from '../store/themeStore'
import type { User } from '../types'

interface ProfileSettingsModalProps {
  user: User
  onUpdate: (statusMessage: string, bio: string) => void
  onClose: () => void
}

export default function ProfileSettingsModal({ user, onUpdate, onClose }: ProfileSettingsModalProps) {
  const { isDarkMode } = useThemeStore()
  const [statusMessage, setStatusMessage] = useState(user.status_message || '')
  const [bio, setBio] = useState(user.bio || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    // Validate
    if (statusMessage.length > 100) {
      setError('Status message must be 100 characters or less')
      return
    }
    if (bio.length > 500) {
      setError('Bio must be 500 characters or less')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:8000/profile/update', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status_message: statusMessage || null,
          bio: bio || null
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Update failed')
      }

      onUpdate(statusMessage, bio)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl max-w-lg w-full p-6`}>
        <h2 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
          Profile Settings
        </h2>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Status Message */}
        <div className="mb-4">
          <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Status Message
            <span className={`ml-2 text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              ({statusMessage.length}/100)
            </span>
          </label>
          <input
            type="text"
            value={statusMessage}
            onChange={(e) => setStatusMessage(e.target.value)}
            maxLength={100}
            placeholder="What's on your mind?"
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              isDarkMode
                ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400'
                : 'bg-white border-gray-300 text-gray-900 focus:border-transparent'
            }`}
          />
          <p className={`mt-1 text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            Short message shown to other users
          </p>
        </div>

        {/* Bio */}
        <div className="mb-6">
          <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            About / Bio
            <span className={`ml-2 text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              ({bio.length}/500)
            </span>
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={500}
            rows={5}
            placeholder="Tell others about yourself..."
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 resize-none ${
              isDarkMode
                ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400'
                : 'bg-white border-gray-300 text-gray-900 focus:border-transparent'
            }`}
          />
          <p className={`mt-1 text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            Longer description visible in your profile
          </p>
        </div>

        {/* Actions */}
        <div className="flex space-x-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
              isDarkMode
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-100'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
            } disabled:cursor-not-allowed`}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
