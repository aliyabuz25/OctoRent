/* OctoRent Progressive Web App Service Worker */
const CACHE_NAME = 'octorent-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Listen for background push events
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { body: event.data ? event.data.text() : 'Məhsul və ya stok yeniləndi' };
  }

  const title = payload.title || 'OctoRent Bildiriş';
  const options = {
    body: payload.body || 'Məhsul məlumatlarında dəyişiklik baş verdi.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [150, 80, 150],
    data: {
      url: payload.url || '/mobile/stock',
      timestamp: Date.now(),
    },
    tag: payload.tag || 'octorent-item-change',
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Listen for local message events from app client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    const notificationOptions = {
      body: options?.body || 'Məhsul məlumatı yeniləndi',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [150, 80, 150],
      data: {
        url: options?.url || '/mobile/stock',
        timestamp: Date.now(),
      },
      tag: options?.tag || 'octorent-item-change',
      renotify: true,
      ...options,
    };

    self.registration.showNotification(title || 'OctoRent Bildirişi', notificationOptions);
  }
});

// On notification click, focus or open mobile app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/mobile';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes('/mobile') && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
