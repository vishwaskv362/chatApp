// Notification sound as base64 encoded audio
const NOTIFICATION_SOUND = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAADhAC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAA4TO5cWyAAAAAAD/+xDEAAAAAAAAAAAAAAAAAAAAAABJbmZvAAAADwAAAAcAAAW5ADo6Ojo6Ojo6Ojo6Ojo6Ojp8fHx8fHx8fHx8fHx8fHx8fH19fX19fX19fX19fX19fX19fn5+fn5+fn5+fn5+fn5+fn5+hoaGhoaGhoaGhoaGhoaGhoaG//////////////////////////////////////////////////AAAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAQkAAAAAAAABbk='

class NotificationService {
  private audio: HTMLAudioElement
  private notificationsEnabled: boolean = false
  private soundEnabled: boolean = true

  constructor() {
    this.audio = new Audio(NOTIFICATION_SOUND)
    this.audio.volume = 0.5
    this.requestPermission()
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('This browser does not support desktop notifications')
      return false
    }

    if (Notification.permission === 'granted') {
      this.notificationsEnabled = true
      return true
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission()
      this.notificationsEnabled = permission === 'granted'
      return this.notificationsEnabled
    }

    return false
  }

  playSound() {
    if (this.soundEnabled) {
      this.audio.currentTime = 0
      this.audio.play().catch(err => console.log('Error playing sound:', err))
    }
  }

  showNotification(title: string, options?: NotificationOptions) {
    if (!this.notificationsEnabled || Notification.permission !== 'granted') {
      return
    }

    // Don't show notification if window is focused
    if (document.hasFocus()) {
      return
    }

    const notification = new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options,
    })

    notification.onclick = () => {
      window.focus()
      notification.close()
    }

    // Auto-close after 5 seconds
    setTimeout(() => notification.close(), 5000)
  }

  setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled
  }

  getSoundEnabled(): boolean {
    return this.soundEnabled
  }

  getNotificationsEnabled(): boolean {
    return this.notificationsEnabled
  }

  setVolume(volume: number) {
    this.audio.volume = Math.max(0, Math.min(1, volume))
  }
}

export const notificationService = new NotificationService()
