const CACHE_NAME = 'ghost-protocol-v1';
const urlsToCache = [
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/@phosphor-icons/web'
];

// Install Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

// Network Interceptor (Bypass cache untuk API Firebase, cache untuk aset statis)
self.addEventListener('fetch', event => {
  if (event.request.url.includes('firestore.googleapis.com')) return;
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
