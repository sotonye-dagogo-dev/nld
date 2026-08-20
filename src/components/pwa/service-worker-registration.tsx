"use client";

import { useEffect } from "react";

// PWA service-worker registration (client only, production-safe).

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.error("[pwa] service worker registration failed:", err);
      });
    }
  }, []);
  return null;
}