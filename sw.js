const CACHE = 'love-myself-v3';

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
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for Firebase/Cloudinary, cache-first for everything else
self.addEventListener('fetch', e => {
  var url = e.request.url;

  // Always go network for Firebase and Cloudinary (data/uploads)
  if (url.includes('firebaseio.com') || url.includes('cloudinary.com')) {
    e.respondWith(
      fetch(e.request).catch(() => {
        return new Response('{}', { headers: { 'Content-Type': 'application/json' } });
      })
    );
    return;
  }

  // Cache-first for everything else (app shell, fonts, etc.)
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
        // If it's a navigation request and we're offline, serve index.html
        if (e.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
