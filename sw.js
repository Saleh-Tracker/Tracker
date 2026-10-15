// Service Worker — يجعل التطبيق يفتح بدون إنترنت.
// الشبكة أولاً (فتظهر التحديثات تلقائياً)، والنسخة المحفوظة عند انقطاع الإنترنت.
const CACHE = 'arbeitszeiten-v15';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function withTimeout(p, ms) {
  return new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('timeout')), ms);
    p.then(v => { clearTimeout(t); res(v); }, err => { clearTimeout(t); rej(err); });
  });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const origin = new URL(req.url).origin;
  // مكتبة jsPDF من cdnjs: من الذاكرة أولاً، فيعمل التصدير بدون إنترنت بعد أول استخدام
  if (origin === 'https://cdnjs.cloudflare.com') {
    e.respondWith(caches.match(req).then(m => m || fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
      return res;
    })));
    return;
  }
  if (origin !== self.location.origin) return;
  e.respondWith(
    withTimeout(fetch(req), 5000)
      .then(res => {
        if (res && res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true })
        .then(m => m || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error())))
  );
});
