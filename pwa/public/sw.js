const CACHE_NAME = 'tpv-dashboard-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700;800&display=swap'
];

// Install Event: cache core app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell...');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: network falling back to cache or stale-while-revalidate for assets
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Only handle http/https requests (ignore chrome-extension, etc.)
  if (!request.url.startsWith('http')) {
    return;
  }

  // Bypass API calls (Supabase & Gemini API) to avoid stale data
  if (request.url.includes('/rest/v1/') || request.url.includes('googleapis.com')) {
    return;
  }

  // Use Stale-While-Revalidate caching strategy for static resources
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch fresh copy in the background
        fetch(request)
          .then((networkResponse) => {
            if (networkResponse?.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, networkResponse);
              });
            }
          })
          .catch((err) => console.warn('[Service Worker] Background update failed:', err));
        
        return cachedResponse;
      }

      // Fallback to network
      return fetch(request).then((networkResponse) => {
        if (networkResponse?.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      });
    })
  );
});
