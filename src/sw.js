import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

self.addEventListener('install',  () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

self.addEventListener('push', (event) => {
  if (!event.data) return
  const { title, body, url } = event.data.json()
  event.waitUntil(
    self.registration.showNotification(title ?? '안다미로', {
      body: body ?? '',
      icon: '/assets/img/pwa/icon-192.png',
      badge: '/assets/img/pwa/icon-192.png',
      data: { url: url ?? '/exchange' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = event.notification.data?.url ?? '/exchange'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const existing = list.find((c) => c.url.includes(target))
      if (existing) return existing.focus()
      return clients.openWindow(target)
    })
  )
})
