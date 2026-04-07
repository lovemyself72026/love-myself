const CACHE = 'love-myself-v3';
const IMG_CACHE = 'love-myself-images-v1';

const STATIC_FILES = [
  './',
  './index.html',
  'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;1,400&family=Nunito:wght@200;300;400&display=swap'
];

// Install: cache the app shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(STATIC_FILES))
      .catch(() => {})
  );
  self.skipWaiting();
});

// Activate: clear old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE && k !== IMG_CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch handler
self.addEventListener('fetch', e => {
  var url = e.request.url;

  // Firebase: always network-first (it's data, not images)
  if (url.includes('firebaseio.com')) {
    e.respondWith(
      fetch(e.request).catch(() => {
        return new Response('{}', { headers: { 'Content-Type': 'application/json' } });
      })
    );
    return;
  }

  // Cloudinary images (GET): cache-first so they work offline
  // Cloudinary uploads (POST): network only
  if (url.includes('cloudinary.com')) {
    if (e.request.method === 'POST') {
      // Upload request — network only, fail naturally if offline
      e.respondWith(fetch(e.request));
      return;
    }
    // Image fetch — cache first, then network and cache the result
    e.respondWith(
      caches.open(IMG_CACHE).then(function(cache) {
        return cache.match(e.request).then(function(cached) {
          if (cached) return cached;
          return fetch(e.request).then(function(res) {
            if (res && res.ok) cache.put(e.request, res.clone());
            return res;
          }).catch(() => new Response('', { status: 408 }));
        });
      })
    );
    return;
  }

  // Everything else (app shell, fonts, etc.): cache-first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.ok) {
          var clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => {
        if (e.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
