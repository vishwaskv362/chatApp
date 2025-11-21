import { useState, useRef, useEffect } from 'react'

interface ReactionPickerProps {
  onReactionSelect: (emoji: string) => void
  show: boolean
  onClose: () => void
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏']

export default function ReactionPicker({ onReactionSelect, show, onClose }: ReactionPickerProps) {
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (show) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [show, onClose])

  if (!show) return null

  return (
    <div
      ref={pickerRef}
      className="absolute bottom-full mb-2 bg-white rounded-lg shadow-xl border border-gray-200 p-2 z-50"
    >
      <div className="flex space-x-1">
        {QUICK_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => {
              onReactionSelect(emoji)
              onClose()
            }}
            className="text-2xl hover:bg-gray-100 rounded p-2 transition transform hover:scale-125"
            title={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}
