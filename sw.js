/* Offline support: every file is stored on the first visit.
   Online, the network copy is used (and the stored copy refreshed); offline, the stored copy is served. */
const CACHE = 'tomasulo-trainer-v1';
const FILES = ['./', 'dp.css', 'index.html', 'js/build.js', 'js/core.js', 'js/datapath.js', 'js/engine.js', 'js/learn.js', 'js/lessons.js', 'js/machine.js', 'js/more.js', 'js/scen.js', 'js/sims.js', 'learn.css', 'ooo.css', 'style.css'];

self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(
    fetch(r).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); }
      return res;
    }).catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || caches.match('index.html')))
  );
});
