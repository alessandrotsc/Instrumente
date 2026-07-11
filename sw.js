// Service Worker: macht die App offline nutzbar und aktualisiert sich automatisch.
// Bei jeder neuen Version die CACHE-Nummer erhoehen (passiert beim Deploy von Hand
// oder spaeter automatisch). Alte Caches werden dann entfernt.
const CACHE = "instrumente-lernen-v2";

const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./src/styles.css",
  "./src/app.js",
  "./src/ui/screens.js",
  "./src/ui/keyboard.js",
  "./src/core/theory.js",
  "./src/core/audio.js",
  "./src/core/input.js",
  "./src/core/srs.js",
  "./src/core/scheduler.js",
  "./src/core/store.js",
  "./src/core/notation.js",
  "./src/core/session.js",
  "./src/modules/noteRecognition.js",
  "./src/instruments/piano.js",
  "./src/instruments/registry.js",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/icon-512-maskable.png",
  "./assets/apple-touch-icon-180.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache zuerst, Netz als Auffrischung (fuer eine App ohne Server ideal).
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then((hit) => {
      const fromNet = fetch(e.request)
        .then((res) => {
          if (res && res.ok && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || fromNet;
    })
  );
});
