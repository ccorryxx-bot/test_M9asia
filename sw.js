const CACHE_NAME = 'MyCasino-cache-v202606281500';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/bootstrap-5.3.7.min.css',
  '/css/swiper-bundle.min.css',
  '/css/style.css',
  '/css/lib-common.css',
  '/css/lib-bonus.css',
  '/css/M9-RWD-R.css',
  '/css/mobile-fix.css',
  '/js/jquery-3.7.1.min.js',
  '/js/bootstrap.bundle-5.3.7.min.js',
  '/js/swiper-bundle.min.js',
  '/js/gameHallRWD.js',
  '/js/GameHallUtils.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.standalone !== undefined) {
    // Handle standalone/PWA mode messages
  }
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never intercept API/service calls — let them go to network directly
  if (url.pathname.startsWith('/service/') || url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // For navigation requests (HTML pages), always fetch from network first
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // For static assets: cache-first strategy
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        // Only cache valid same-origin responses
        if (
          response.ok &&
          url.origin === self.location.origin &&
          event.request.method === 'GET'
        ) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      }).catch(() => cached);
    })
  );
});
