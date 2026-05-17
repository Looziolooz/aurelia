"use client";

import { useEffect } from "react";

/**
 * Registers the kiosk service worker (public/sw.js) — production only.
 * In dev the SW is intentionally NOT registered: it would cache Turbopack
 * dev chunks and fight HMR. The SW itself is network-first for navigations
 * so a redeploy is never shadowed (see public/sw.js header).
 */
export function PWARegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Offline support is progressive enhancement — never block the app.
      });
    };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });
    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}
