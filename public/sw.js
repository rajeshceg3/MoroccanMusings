try {
    importScripts('assets-manifest.js');
} catch (e) {
    console.error('Failed to load assets manifest:', e);
    // Fallback if manifest fails
    self.MANIFEST = ['./', 'index.html', 'css/styles.css', 'js/bootstrap.js', 'js/app.js'];
}

const CACHE_NAME = 'marq-v3';
const ASSETS = self.MANIFEST || ['./', 'index.html', 'css/styles.css', 'js/bootstrap.js', 'js/app.js'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // Ensure manifest is loaded
            const assetsToCache = ASSETS.length > 0 ? ASSETS : ['./'];
            return cache.addAll(assetsToCache);
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
        // Core Logic/UI: Network-First (Mission Critical)
        // Ensures operators always receive the latest tactical software.
        // Fallback to cache only if offline.
        event.respondWith(
            fetch(event.request)
                .then((networkResponse) => {
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
                })
                .catch(() => {
                    // Network failed, fallback to cache (Offline Mode)
                    return caches.match(event.request);
                })
        );
    }
});
