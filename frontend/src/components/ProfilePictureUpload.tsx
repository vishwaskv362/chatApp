import { useState, useRef } from 'react'
import { useThemeStore } from '../store/themeStore'

interface ProfilePictureUploadProps {
  currentPicture?: string
  onUploadSuccess: (pictureUrl: string) => void
  onClose: () => void
}

export default function ProfilePictureUpload({ currentPicture, onUploadSuccess, onClose }: ProfilePictureUploadProps) {
  const { isDarkMode } = useThemeStore()
  const [preview, setPreview] = useState<string | null>(currentPicture || null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setError('Please select a valid image file (JPG, PNG, GIF, or WebP)')
      return
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      setError('File size must be less than 5MB')
      return
    }

    setError(null)
    setSelectedFile(file)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploading(true)
    setError(null)

    try {
      const token = localStorage.getItem('token')
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch('http://localhost:8000/profile/upload-picture', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Upload failed')
      }

      const data = await response.json()
      onUploadSuccess(data.profile_picture)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to upload profile picture')
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = async () => {
    if (!currentPicture) return

    setUploading(true)
    setError(null)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:8000/profile/delete-picture', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Delete failed')
      }

      onUploadSuccess('')
      setPreview(null)
      setSelectedFile(null)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to delete profile picture')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl max-w-md w-full p-6`}>
        <h2 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
          Profile Picture
        </h2>

        {/* Preview */}
        <div className="mb-6 flex justify-center">
          <div className="relative">
            {preview ? (
              <img
                src={preview.startsWith('http') ? preview : preview}
                alt="Profile preview"
                className="w-32 h-32 rounded-full object-cover border-4 border-blue-500"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-4xl font-bold">
                ?
              </div>
            )}
          </div>
        </div>

        {/* File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={`w-full py-2 px-4 rounded-lg font-medium transition ${
              isDarkMode
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            } disabled:bg-gray-400 disabled:cursor-not-allowed`}
          >
            {selectedFile ? 'Choose Different Picture' : 'Choose Picture'}
          </button>

          {selectedFile && (
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : 'Upload Picture'}
            </button>
          )}

          {currentPicture && !selectedFile && (
            <button
              onClick={handleRemove}
              disabled={uploading}
              className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {uploading ? 'Removing...' : 'Remove Picture'}
            </button>
          )}

          <button
            onClick={onClose}
            disabled={uploading}
            className={`w-full py-2 px-4 rounded-lg font-medium transition ${
              isDarkMode
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-100'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
            } disabled:cursor-not-allowed`}
          >
            Cancel
          </button>
        </div>

        {/* Info */}
        <p className={`mt-4 text-xs text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Accepted formats: JPG, PNG, GIF, WebP (Max 5MB)
        </p>
      </div>
    </div>
  )
}
