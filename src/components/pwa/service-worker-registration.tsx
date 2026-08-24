"use client";

import { useEffect } from "react";

// PWA service-worker registration (client only, production-safe).

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("[pwa] service worker registered:", registration.scope);
        })
        .catch((err) => {
          // Swallow errors - SW registration failure shouldn't break the app
          console.warn("[pwa] service worker registration failed (non-fatal):", err);
        });
    }
  }, []);
  return null;
}