const CACHE_NAME = 'ghost-protocol-v15.0.0';

// Aset inti yang wajib di-cache untuk kapabilitas luring (offline)
const APP_SHELL = [
    '/',
    '/index.html',
    '/manifest.json'
];

// [1] INSTALLATION: Mengunduh App Shell ke dalam memori peramban
self.addEventListener('install', (event) => {
    self.skipWaiting(); // Memaksa SW baru untuk langsung mengontrol klien
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching App Shell');
            return cache.addAll(APP_SHELL);
        })
    );
});

// [2] ACTIVATION: Memusnahkan versi cache lama (Pencegahan Split-Brain)
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('[SW] Memusnahkan cache usang:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// [3] FETCH STRATEGY: Network-First, Fallback to Cache
self.addEventListener('fetch', (event) => {
    // Bypass interceptor untuk trafik Firestore/WebRTC agar real-time tidak terganggu
    if (event.request.url.includes('firestore.googleapis.com') || 
        event.request.url.includes('firebase') || 
        event.request.url.includes('stun:')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                // Jika jaringan berhasil, perbarui cache secara siluman
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            })
            .catch(() => {
                // Jika jaringan mati/gagal, ambil dari Cache V15
                console.log('[SW] Network mati, menyajikan dari Cache fallback.');
                return caches.match(event.request);
            })
    );
});

// [4] PUSH NOTIFICATIONS: Handler untuk notifikasi sistem operasi
self.addEventListener('push', function(event) {
    if (event.data) {
        const data = event.data.json();
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: data.icon || 'https://cdn-icons-png.flaticon.com/512/3064/3064048.png',
            vibrate: [200, 100, 200],
            requireInteraction: true
        });
    }
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            for (let i = 0; i < clientList.length; i++) {
                let client = clientList[i];
                if (client.url.includes('/') && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
})
