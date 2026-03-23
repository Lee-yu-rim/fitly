const CACHE = 'fitlog-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS.filter(a => !a.startsWith('http') || a.includes('fonts'))))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Firebase 요청은 캐시 안 함 (실시간 데이터)
  if (e.request.url.includes('firebaseio.com') || e.request.url.includes('firebase')) {
    return;
  }
  // Google Fonts는 네트워크 우선
  if (e.request.url.includes('fonts.googleapis') || e.request.url.includes('fonts.gstatic')) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }
  // 나머지는 캐시 우선
  e.respondWith(
    caches.match(e.request).then(cached => {
      return cached || fetch(e.request).then(resp => {
        if (resp && resp.status === 200 && resp.type === 'basic') {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      });
    }).catch(() => caches.match('./index.html'))
  );
});
