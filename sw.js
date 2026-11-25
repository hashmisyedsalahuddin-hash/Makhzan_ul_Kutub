const CACHE_NAME = "makhzan-live-v6";
const CORE_ASSETS = [
  "./",
  "./Mishkat.html",
  "./Script.js",
  "./Style.css",
  "./data/mishkat/book_01.json",
  "./data/mishkat/index.json",
  "./data/mishkat/muqaddima.json",
  "./index.html",
  "./mishkat-engine.js"
];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE_NAME).then((c) => Promise.all(CORE_ASSETS.map((u) => c.add(u).catch(() => {}))))); self.skipWaiting(); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", (e) => { if (e.request.method !== "GET") return; const url = new URL(e.request.url); if (url.origin !== self.location.origin) return; if (url.pathname.endsWith("version.json")) { e.respondWith(fetch(e.request, { cache: "no-store" })); return; } e.respondWith(fetch(e.request, { cache: "no-store" }).then((res) => { if (res && res.status === 200) { const cp = res.clone(); caches.open(CACHE_NAME).then((c) => c.put(e.request, cp)); } return res; }).catch(() => caches.match(e.request, { ignoreSearch: true }))); });
