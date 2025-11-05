// Enhanced Service Worker for PWA
const CACHE_NAME = "quizquezt-v2";
const urlsToCache = [
  "/",
  "/?source=pwa",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (event) => {
  console.log("🛠️ Service Worker: Installing...");

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("📦 Opened cache");
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log("✅ All resources cached");
        return self.skipWaiting(); // Force activation
      })
  );
});

self.addEventListener("activate", (event) => {
  console.log("🎉 Service Worker: Activated!");

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log("🗑️ Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log("✅ Claiming clients");
        return self.clients.claim(); // Take control of all pages
      })
  );
});

self.addEventListener("fetch", (event) => {
  // For PWA installation, we need proper fetch handling
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version or fetch from network
      if (response) {
        return response;
      }
      return fetch(event.request);
    })
  );
});
