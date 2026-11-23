// Notifications Wishdisc (chargé par le service worker de l'app)
// Reçoit les notifications envoyées par la fonction Supabase « notify »
// et ouvre la bonne page quand on touche la notification.

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'Wishdisc', body: event.data ? event.data.text() : '' }
  }
  const title = data.title || 'Wishdisc'
  const options = {
    body: data.body || '',
    icon: '/pwa-192x192.png',
    badge: '/badge-96.png',
    tag: data.tag, // un seul avis par conversation : le nouveau remplace l'ancien
    renotify: !!data.tag,
    data: { url: data.url || '/' },
  }

  event.waitUntil(
    (async () => {
      // L'app est ouverte et visible sur cette page : pas besoin d'avertir
      const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const target = new URL(options.data.url, self.location.origin).href
      const visible = wins.some((w) => w.visibilityState === 'visible' && w.focused && w.url === target)
      if (visible) return
      await self.registration.showNotification(title, options)
      // Pastille sur l'icône de l'app (iPhone, Android, ordinateur)
      if (typeof data.badge === 'number' && self.navigator.setAppBadge) {
        try {
          await self.navigator.setAppBadge(data.badge)
        } catch {
          // pas grave
        }
      }
    })()
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href
  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      // L'app est déjà ouverte : on la ramène devant, sur la bonne page
      for (const w of wins) {
        if (new URL(w.url).origin === self.location.origin) {
          await w.focus()
          if ('navigate' in w) return w.navigate(url)
          return
        }
      }
      return self.clients.openWindow(url)
    })()
  )
})
