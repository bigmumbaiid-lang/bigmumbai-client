// Take over immediately on update, instead of waiting for every tab running
// the old service worker to fully close — otherwise icon/text fixes here can
// silently lag behind a deploy for however long a tab stays open.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch {
        data = { title: 'Notification', body: event.data ? event.data.text() : '' };
    }

    const title = data.title || 'Notification';
    const options = {
        body: data.body || '',
        icon: '/notification-icon.png',
        badge: '/favicon.ico',
        data: data.data || {},
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if ('focus' in client) return client.focus();
            }
            if (clients.openWindow) return clients.openWindow('/');
        })
    );
});
