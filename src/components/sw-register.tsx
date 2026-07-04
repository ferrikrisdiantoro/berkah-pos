"use client";

import { useEffect } from "react";

/** Mendaftarkan service worker agar aplikasi memenuhi syarat installable (APK/PWA). */
export function SwRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
