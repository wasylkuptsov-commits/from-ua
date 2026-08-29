// sw.js - Service Worker PWA z obsługą trybu offline i buforowaniem zasobów
const CACHE_NAME = 'katalog-b2b-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './database.js',
  './parser.js',
  './scraper.js',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap'
];

// Instalacja Service Workera i buforowanie plików aplikacji
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[Service Worker] Buforowanie zasobów aplikacji PWA...');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Aktywacja i czyszczenie starych wersji pamięci podręcznej
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Usuwanie starej pamięci cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Przechwytywanie zapytań (Strategia: Network First, Fallback to Cache dla trybu offline)
self.addEventListener('fetch', event => {
  // Ignorujemy zapytania typu non-GET (POST, PUT, DELETE itp.)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Jeśli odpowiedź jest poprawna, klonujemy ją do cache
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Gdy brak połączenia z siecią (Offline), serwujemy wersję z pamięci podręcznej
        return caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.headers.get('accept').includes('text/html')) {
            return caches.match('./index.html');
          }
        });
      })
  );
});
