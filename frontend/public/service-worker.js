const CACHE_NAME = 'attendance-hub-v4';
const ASSETS = [
  './auth.html',
  './index.html',
  './student-dashboard.html',
  './admin.html',
  './faculty-dashboard.html',
  'https://image2url.com/r2/default/images/1773668714074-7eaefdc5-c41e-4f3b-a408-a1285f72e3c4.png',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request).then((networkResponse) => {
        // If the response is a redirect and the request doesn't allow it, 
        // the browser would normally throw. We just return it and let 
        // the browser handle it, or fallback.
        return networkResponse;
      }).catch(() => {
        // Return index.html or auth.html as fallback for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('./auth.html');
        }
      });
    })
  );
});

self.addEventListener('push', (event) => {
    const data = event.data.json();
    self.registration.showNotification(data.title, {
        body: data.body,
        icon: 'https://image2url.com/r2/default/images/1773668714074-7eaefdc5-c41e-4f3b-a408-a1285f72e3c4.png',
        badge: 'https://image2url.com/r2/default/images/1773668714074-7eaefdc5-c41e-4f3b-a408-a1285f72e3c4.png'
    });
});
