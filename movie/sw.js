importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');
const CACHE_NAME = 'prasxmovie-v2.1'; // Bumped version to force update

// Update these paths to point specifically to your movie folder assets
const CORE_ASSETS = [
  '/movie/',              // The movie app entry point
  '/movie/index.html',    // Explicitly cache the movie's HTML file
  '/manifest.json',       // (Make sure this path is correct, e.g., '/movie/manifest.json' if it's inside the folder)
  '/icon-192.png',        // (Same here, update if inside /movie/)
  '/icon-512.png'         // (Same here, update if inside /movie/)
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
        // CHANGED: Serve the movie folder offline instead of the root '/'
        return caches.match('/movie/') || caches.match('/movie/index.html');
      })
    );
  } else {
    // For all other requests (images, API data, etc.)
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request);
      })
    );
  }
});
