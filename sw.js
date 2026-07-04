// Service worker: offline cache for the DevTools pages.
// Bump CACHE to force clients to re-fetch everything after a deploy.
"use strict";

const CACHE = "devtools-v2";
const CORE = ["./", "./index.html", "./assets/common.css", "./assets/common.js", "./assets/icon.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function cachePut(req, res) {
  if (res && res.ok) caches.open(CACHE).then(c => c.put(req, res));
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== location.origin) return;

  if (req.mode === "navigate") {
    // Network-first for pages: fresh when online, cached when offline.
    e.respondWith(
      fetch(req).then(res => { cachePut(req, res.clone()); return res; })
        .catch(() => caches.match(req).then(hit => hit || caches.match("./index.html")))
    );
  } else {
    // Cache-first for assets.
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => { cachePut(req, res.clone()); return res; }))
    );
  }
});
