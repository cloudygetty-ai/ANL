// Service Worker — offline-first caching + background sync
const CACHE_VERSION = 'anl-v1';
const CACHE_STATIC = `${CACHE_VERSION}-static`;
const CACHE_DYNAMIC = `${CACHE_VERSION}-dynamic`;
const CACHE_API = `${CACHE_VERSION}-api`;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_STATIC).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Fail gracefully if assets don't exist yet
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names
          .filter((name) => name.startsWith('anl-') && name !== CACHE_STATIC && name !== CACHE_DYNAMIC && name !== CACHE_API)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // API calls — network first, fall back to cache
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            caches.open(CACHE_API).then((cache) => cache.put(request, res.clone()));
          }
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // HTML/JS/CSS — cache first, fall back to network
  if (request.destination === 'document' || request.destination === 'script' || request.destination === 'style') {
    e.respondWith(
      caches
        .match(request)
        .then((res) => res || fetch(request).then((res) => {
          if (res.ok) {
            caches.open(CACHE_DYNAMIC).then((cache) => cache.put(request, res.clone()));
          }
          return res;
        }))
        .catch(() => new Response('Offline', { status: 503 }))
    );
    return;
  }

  // Images — cache first
  if (request.destination === 'image') {
    e.respondWith(
      caches.match(request).then((res) =>
        res ||
        fetch(request).then((res) => {
          if (res.ok) {
            caches.open(CACHE_DYNAMIC).then((cache) => cache.put(request, res.clone()));
          }
          return res;
        })
      )
    );
    return;
  }

  // Default — network first
  e.respondWith(
    fetch(request)
      .then((res) => (res.ok ? res : caches.match(request) || res))
      .catch(() => caches.match(request) || new Response('Offline', { status: 503 }))
  );
});

// Background sync for messages (when back online)
self.addEventListener('sync', (e) => {
  if (e.tag === 'sync-messages') {
    e.waitUntil(
      caches.open(CACHE_API).then((cache) => {
        return cache.keys().then((keys) => {
          const pendingMsgs = keys.filter((req) => req.url.includes('/api/messages/send'));
          return Promise.all(
            pendingMsgs.map((req) =>
              fetch(req).then((res) => {
                if (res.ok) cache.delete(req);
                return res;
              })
            )
          );
        });
      })
    );
  }
});
