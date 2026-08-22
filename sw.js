const CACHE_NAME = 'attendance-app-v1';
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
    'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
    'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    if (event.request.url.includes('googleapis.com')) return;

    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request).then((networkResponse) => {
                if (event.request.url.includes('gstatic.com/firebasejs')) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
                }
                return networkResponse;
            });
        })
    );
});
