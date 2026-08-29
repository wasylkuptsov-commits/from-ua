const CACHE_NAME = 'katalog-b2b-v1.0';
const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './database.js',
  './kravets_catalog_data.js',
  './kraft_catalog_data.js',
  './manifest.json',
  './assets/icons/icon-192x192.png',
  './assets/icons/icon-512x512.png',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/favicon-32x32.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Instalacja Service Workera i buforowanie kluczowych plików
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Buforowanie zasobów aplikacji...');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[Service Worker] Częściowy błąd buforowania wstępnego:', err);
      });
    })
  );
  self.skipWaiting();
});

// Aktywacja nowego Service Workera i czyszczenie starych cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Usuwanie starej pamięci cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Strategia Stale-While-Revalidate dla błyskawicznego ładowania
self.addEventListener('fetch', (event) => {
  // Ignorujemy zapytania inne niż GET oraz chrome-extension
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // W razie braku internetu zwracamy z cache jeśli istnieje
        return cachedResponse;
      });

      return cachedResponse || fetchPromise;
    })
  );
});
