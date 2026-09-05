// Minimal service worker whose only job is Web Push — this app has no
// offline-caching strategy (Vite handles the app shell fine on its own),
// so there's no fetch handler here, just push + notificationclick.
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = {}
  }
  const title = data.title || 'Guess the Future'
  const options = {
    body: data.body || '',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    data: { url: data.url || '/' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

// HashRouter means every real route lives after a '#' — the payload's
// `url` (e.g. "/tahmin-kaydi?id=...") is a plain path, so it's joined onto
// "/#" here rather than baked in server-side.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetPath = (event.notification.data && event.notification.data.url) || '/'
  const targetUrl = new URL(`/#${targetPath}`, self.location.origin).href

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          if ('navigate' in client) client.navigate(targetUrl)
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl)
    })
  )
})
