const CACHE_NAME = 'animex-pwa-v1';
const urlsToCache = [
  '/Anime/',
  '/Anime/index.html',
  '/Anime/manifest.json',
  '/Anime/icon-192.png',
  '/Anime/icon-512.png'
];

// Install Event - Caches essential files
self.addEventListener('install', event => {
  self.skipWaiting(); // Forces new service worker to activate immediately
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

// Activate Event - Clears old caches when you update the app
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
      );
    })
  );
});

// Fetch Event - Serves from network first, falls back to cache if offline
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
