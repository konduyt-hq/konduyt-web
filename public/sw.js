// Konduyt service worker.
// Strategy: NETWORK-FIRST for navigations and same-origin requests, so a fresh
// deploy is always served when the user is online. The cache is only a fallback
// for offline. This deliberately avoids the classic PWA trap where an aggressive
// cache serves stale versions after a deploy.

const CACHE = 'konduyt-v1';
const OFFLINE_URLS = ['/', '/signin/', '/signup/'];

self.addEventListener('install', (event) => {
  // Activate this worker immediately instead of waiting for old tabs to close.
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(OFFLINE_URLS).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  // Clean up any old caches from previous versions and take control now.
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET; never touch API calls or cross-origin (e.g. the Render API).
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Update the cache with the fresh copy for offline fallback.
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy).catch(() => {}));
        return response;
      })
      .catch(() =>
        // Offline: serve from cache, or fall back to the home shell.
        caches.match(request).then((cached) => cached || caches.match('/'))
      )
  );
});
