export type OrderNotificationPayload = {
  title: string
  body: string
  tag?: string
  url?: string
  urgent?: boolean
}

const SW_PATH = '/sw.js'

export async function registerOrderNotificationServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.register(SW_PATH, { scope: '/' })
  } catch (error) {
    console.warn('Could not register notification service worker', error)
    return null
  }
}

export async function requestOrderNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied'
  await registerOrderNotificationServiceWorker()
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  return Notification.requestPermission()
}

export async function showOrderNotification({
  title,
  body,
  tag,
  url,
  urgent = false,
}: OrderNotificationPayload): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  const options: NotificationOptions & { renotify?: boolean } = {
    body,
    tag: tag ?? title,
    renotify: true,
    requireInteraction: urgent,
    silent: false,
    data: { url: url ?? '/admin/orders' },
  }

  try {
    const registration = await navigator.serviceWorker.ready
    await registration.showNotification(title, options)
    return
  } catch {
    // Fall back to page Notification API if service worker is unavailable.
  }

  try {
    new Notification(title, options)
  } catch (error) {
    console.warn('Could not show notification', error)
  }
}

export function playNewOrderSound() {
  if (typeof window === 'undefined') return
  try {
    const ctx = new AudioContext()
    ;[0, 0.3, 0.6].forEach(time => {
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      oscillator.frequency.value = 1000
      oscillator.type = 'square'
      gainNode.gain.setValueAtTime(0.8, ctx.currentTime + time)
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + time + 0.25)
      oscillator.start(ctx.currentTime + time)
      oscillator.stop(ctx.currentTime + time + 0.25)
    })
  } catch {
    // Browsers may block audio when the tab is in the background.
  }
}

export function playDeliveredSound() {
  if (typeof window === 'undefined') return
  try {
    const ctx = new AudioContext()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    oscillator.frequency.value = 660
    oscillator.type = 'sine'
    gainNode.gain.setValueAtTime(0.5, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.4)
  } catch {
    // Ignore audio failures in background tabs.
  }
}

export function vibrateNewOrder() {
  navigator.vibrate?.([500, 200, 500])
}
