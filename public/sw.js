self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', event => {
  const data = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title || 'Smoked Style', {
      body: data.body || '',
      tag: data.tag || 'smoked-new-order',
      renotify: true,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [500, 200, 500],
      requireInteraction: true,
      data: { url: data.url || '/boss/orders' },
    }),
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/boss/orders'
  const absoluteUrl = new URL(targetUrl, self.location.origin).href

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(absoluteUrl)
      }
    }),
  )
})
