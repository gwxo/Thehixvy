const CACHE_NAME = 'prasxmovie-v2';

// These are the core files that will be saved to the user's phone for offline use
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Install: Save core files to the device
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching offline assets...');
      return cache.addAll(CORE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate: Clean up any old versions of the cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: How the app handles internet requests
self.addEventListener('fetch', (event) => {
  // If the user is trying to load a webpage (HTML)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        // If internet is OFF, serve the cached index.html
        // Your custom "No Internet" overlay will automatically trigger!
        return caches.match('/');
      })
    );
  } else {
    // For all other requests (images, API data, etc.)
    // Try the network first, if it fails (offline), see if we have it in the cache
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request);
      })
    );
  }
});
