const CACHE_NAME = 'attendance-app-v2';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/student.html',
    '/faculty.html',
    '/css/style.css',
    '/js/firebase-config.js',
    '/js/auth.js',
    '/js/student.js',
    '/js/faculty.js',
    '/js/studentsData.js',
    'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
    'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg'
];

self.addEventListener('install', (event) => {
    // Skip waiting so the new service worker activates immediately
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
    );
});

self.addEventListener('activate', (event) => {
    // Delete old caches to ensure the newest files are served
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    if (event.request.url.includes('googleapis.com')) return;

    // Network-first strategy for our local files to ensure updates happen
    event.respondWith(
        fetch(event.request).then((networkResponse) => {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
            return networkResponse;
        }).catch(() => {
            return caches.match(event.request);
        })
    );
});
