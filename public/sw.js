const CACHE_NAME = 'marq-v3';
const ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './assets/noise.svg',
    './css/styles.css',
    './css/terminal.css',
    './js/app.js',
    './js/bootstrap.js',
    './js/state.js',
    './js/data.js',
    './js/ui-system.js',
    './js/error-guard.js',
    './js/tapestry.js',
    './js/terminal.js',
    './js/terminal-commands.js',
    './js/crypto-guard.js',
    './js/alchemy.js',
    './js/horizon.js',
    './js/audio-engine.js',
    './js/spectra.js',
    './js/codex.js',
    './js/codex.worker.js',
    './js/cartographer.js',
    './js/oracle.js',
    './js/aegis.js',
    './js/chronos.js',
    './js/citadel.js',
    './js/cortex.js',
    './js/gemini.js',
    './js/heatmap.js',
    './js/legion.js',
    './js/mnemosyne.js',
    './js/panopticon.js',
    './js/prometheus.js',
    './js/scenarios.js',
    './js/sentinel.js',
    './js/stratagem.js',
    './js/stratcom.js',
    './js/synapse.js',
    './js/valkyrie.js',
    './js/vanguard.js',
    './js/astrolabe-ui.js',
    './js/ghost-guide.js',
    './js/legion-ui.js',
    './js/mnemosyne-ui.js',
    './js/riad-ui.js',
    './js/settings-ui.js',
    './js/stratagem-ui.js',
    './js/valkyrie-ui.js',
    './js/controllers/SplashController.js',
    './js/controllers/TapestryController.js',
    './js/controllers/WeavingController.js'
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
