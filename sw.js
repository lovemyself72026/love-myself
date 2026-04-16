const CACHE = 'love-myself-v4';
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

// Keys that should be synced to Firebase
const SYNC_KEYS = [
  'all_planner_data','my_wins','saved_affirmations','vent_entries','dimension_items',
  'whoi_history','whoi_woh_history','my_books','habit_tracker','cali_log',
  'wia2','wia2aff','wia2q','wia2wq',
  'hlb','hlr',
  'ass_checkin','ass_checkin_log','ass_log','ass_entries_asking','ass_entries_giving',
  'bel_foundation','bel_evidence','bel_failure','belief_beliefs','bel_checkin_log',
  'balance_data','that_girl_data','vision_items','ritual_state','user_rituals',
  'bc_habits_data','face_habits_data','daily_data','rfm_data','jesus_data',
  'my_routine_data','routine_todos','routine_notes','routine_photos','sched_photos',
  'infp_data','friends_data'
];

const SYNC_PREFIXES = [
  'ass_entries_','ass_notes_',
  'jesus_','bc_','rfm_',
  'rhythm_day_','rhythm_month_','rhythm_year_'
];

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
