const CACHE_NAME = 'baby-zhu-v6';
const ASSETS = [
    'index.html',
    'css/style.css',
    'js/firebase-config.js',
    'js/db.js',
    'js/security.js',
    'js/app.js',
    'js/tracker.js',
    'js/village.js',
    'js/scrapbook.js',
    'js/journal.js',
    'js/voice.js',
    'js/voice-memo.js',
    'js/inventory.js',
    'js/registry.js',
    'js/growth.js',
    'manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.url.includes('firebasejs') || event.request.url.includes('googleapis')) {
        return;
    }
    event.respondWith(
        caches.match(event.request).then((response) => response || fetch(event.request))
    );
});
