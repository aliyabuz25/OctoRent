const API_BASE_URL = typeof __RUNSTOCK_API_BASE_URL__ !== 'undefined' ? __RUNSTOCK_API_BASE_URL__ : '';
let eventSource = null;

export async function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  try {
    const perm = await Notification.requestPermission();
    return perm;
  } catch {
    return 'denied';
  }
}

export function showSystemNotification(title, options = {}) {
  if (typeof window === 'undefined') return;

  const defaultOptions = {
    body: 'Məhsul və ya stok məlumatlarında dəyişiklik baş verdi.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [150, 80, 150],
    data: { url: options.url || '/mobile/stock' },
    tag: options.tag || 'runstock-item-change',
  };

  const finalOptions = { ...defaultOptions, ...options };

  // Dispatch local DOM event for in-app reaction (live refresh / toast)
  try {
    window.dispatchEvent(new CustomEvent('runstock:notification', {
      detail: { title, options: finalOptions }
    }));
  } catch {}

  // 1. Service Worker registration notification (Required for Android PWA background & home screen)
  if ('serviceWorker' in navigator) {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SHOW_NOTIFICATION',
        title,
        options: finalOptions,
      });
      return;
    }

    navigator.serviceWorker.ready
      .then((reg) => {
        reg.showNotification(title, finalOptions);
      })
      .catch(() => {
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification(title, finalOptions);
          } catch {}
        }
      });
    return;
  }

  // 2. Direct browser notification fallback
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, finalOptions);
    } catch (e) {
      console.warn('Direct notification error:', e);
    }
  }
}

export function initRealtimeNotifications() {
  if (typeof window === 'undefined') return;

  // 1. Register Service Worker for PWA & Background Notifications
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        console.log('OctoRent PWA Service Worker aktivdir:', reg.scope);
      })
      .catch((err) => {
        console.warn('Service Worker qeydiyyat xətası:', err);
      });
  }

  // 2. Setup Real-time SSE Stream for Product Changes
  if (eventSource) {
    try {
      eventSource.close();
    } catch {}
  }

  let token = null;
  try {
    const raw = localStorage.getItem('runstock.auth');
    if (raw) token = JSON.parse(raw)?.token;
  } catch {}

  if (!token) return;

  try {
    const sseUrl = `${API_BASE_URL}/api/realtime/notifications?token=${encodeURIComponent(token)}`;
    eventSource = new EventSource(sseUrl);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data && data.title) {
          showSystemNotification(data.title, data);
        }
      } catch (err) {
        console.warn('Realtime bildiriş oxuma xətası:', err);
      }
    };

    eventSource.onerror = () => {
      try {
        eventSource.close();
      } catch {}
      setTimeout(initRealtimeNotifications, 8000);
    };
  } catch (err) {
    console.warn('Realtime eventSource xətası:', err);
  }
}
