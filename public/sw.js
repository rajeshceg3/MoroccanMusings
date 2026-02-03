const CACHE_NAME = 'marq-v2';
const ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './css/styles.css',
    './css/terminal.css',
    './js/app.js',
    './js/data.js',
    './js/tapestry.js',
    './js/audio-engine.js',
    './js/alchemy.js',
    './js/horizon.js',
    './js/terminal.js',
    './js/crypto-guard.js',
    './js/spectra.js',
    './js/ui-system.js',
    './js/codex.js',
    './js/codex.worker.js',
    './js/cartographer.js',
    './js/oracle.js',
    './assets/noise.svg'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('activate', (event) => {
    // Clean up old caches
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(
                keyList.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    // Strategy: Stale-While-Revalidate for core assets
    // This ensures fast load (stale) but updates in background for next visit

    if (
        event.request.destination === 'image' &&
        event.request.url.includes('unsplash')
    ) {
        // Cache external images with Cache-First (they rarely change)
        event.respondWith(
            caches.match(event.request).then((response) => {
                return (
                    response ||
                    fetch(event.request).then((response) => {
                        if (
                            !response ||
                            response.status !== 200 ||
                            (response.type !== 'basic' &&
                                response.type !== 'cors')
                        ) {
                            return response;
                        }
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                        return response;
                    })
                );
            })
        );
    } else {
        // Core Logic/UI: Stale-While-Revalidate
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                const fetchPromise = fetch(event.request).then(
                    (networkResponse) => {
                        // Update the cache with the fresh response
                        if (
                            networkResponse &&
                            networkResponse.status === 200 &&
                            networkResponse.type === 'basic'
                        ) {
                            const responseToCache = networkResponse.clone();
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(event.request, responseToCache);
                            });
                        }
                        return networkResponse;
                    }
                );

                // Return cached response immediately if available, otherwise wait for network
                return cachedResponse || fetchPromise;
            })
        );
    }
});
