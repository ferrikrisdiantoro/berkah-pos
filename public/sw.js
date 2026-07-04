// Service worker minimal — cukup untuk syarat installable (PWA/APK).
// App butuh data real-time, jadi tidak melakukan caching agresif.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {
  // Passthrough ke jaringan (biarkan browser menangani).
});
