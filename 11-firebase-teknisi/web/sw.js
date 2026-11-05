// Service worker minimal: kerangka aplikasi tetap terbuka tanpa sinyal.
// Data tugas offline ditangani cache IndexedDB Firestore, bukan berkas ini.
const CACHE = "tugas-teknisi-v1";
const KERANGKA = ["./", "index.html", "style.css", "app.js", "konfigurasi.js", "manifest.webmanifest", "ikon.svg", "shared/charts.js", "shared/charts.css"];

self.addEventListener("install", (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(KERANGKA)).then(() => self.skipWaiting())));
self.addEventListener("activate", (e) => e.waitUntil(
  caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
));
// jaringan dulu, cache bila offline; hanya berkas satu origin
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then((r) => {
    const salin = r.clone();
    caches.open(CACHE).then((c) => c.put(e.request, salin));
    return r;
  }).catch(() => caches.match(e.request)));
});
