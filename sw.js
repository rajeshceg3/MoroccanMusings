
const CACHE_NAME = 'marq-v1';
const ASSETS = [
    './',
    './index.html',
    './css/styles.css',
    './css/terminal.css',
    './js/app.js',
    './js/data.js',
    './js/tapestry.js',
    './js/audio-engine.js',
    './js/alchemy.js',
    './js/horizon.js',
    './js/terminal.js',
    './assets/noise.svg'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('fetch', (event) => {
    // Stale-while-revalidate strategy for same-origin
    if (event.request.destination === 'image' && event.request.url.includes('unsplash')) {
        // Cache external images with cache-first
        event.respondWith(
            caches.match(event.request).then((response) => {
                return response || fetch(event.request).then((response) => {
                    // Check if we received a valid response
                    if (!response || response.status !== 200 || response.type !== 'basic' && response.type !== 'cors') {
                        return response;
                    }
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                    return response;
                });
            })
        );
    } else {
        event.respondWith(
            caches.match(event.request).then((response) => {
                return response || fetch(event.request);
            })
        );
    }
});
