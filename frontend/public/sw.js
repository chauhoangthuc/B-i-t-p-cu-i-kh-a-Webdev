const CACHE_NAME = 'trip-manager-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/src/main.jsx',
  '/src/index.css',
  '/src/assets/images/favicon.png',
  '/src/assets/images/logo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Apply caching strategies for PostgREST reads
  if (request.method === 'GET' && url.pathname.includes('/rpc/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return fetch(request)
          .then((response) => {
            cache.put(request, response.clone());
            return response;
          })
          .catch(() => cache.match(request));
      })
    );
  } else {
    // Default Stale-While-Revalidate for app assets
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, networkResponse.clone());
            });
          }
          return networkResponse;
        }).catch(() => null);

        return cachedResponse || fetchPromise;
      })
    );
  }
});
