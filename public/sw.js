/* AURELIA Pro X1 totem — kiosk service worker.
 *
 * Goal (brief §6 #9): the totem keeps working offline after the first
 * load. The live model is procedural JS (no network), so once the app
 * shell + hashed chunks + the one runtime HDR are cached, it runs with
 * no connection.
 *
 * Kiosk-safe by design — the classic SW footgun is permanently shadowing
 * a new deploy. Mitigations:
 *  - navigations: NETWORK-FIRST (always try the server; cache is only the
 *    offline fallback) so a redeploy is picked up immediately when online;
 *  - static/_next assets are content-hashed → cache-first is safe (new
 *    build = new URLs); the stable-named HDR uses stale-while-revalidate;
 *  - bump CACHE to invalidate; old caches are deleted on activate;
 *  - skipWaiting + clients.claim so an updated SW takes over at once.
 */
const CACHE = "aurelia-totem-v1";
const SHELL = "/it"; // default-locale app shell (next-intl redirects "/")
const PRECACHE = [SHELL, "/icon.svg", "/hdr/studio_small_03_1k.hdr"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(PRECACHE).catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navigations: network-first, fall back to the cached shell offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(SHELL, copy)).catch(() => {});
          return res;
        })
        .catch(() =>
          caches.match(req).then((m) => m || caches.match(SHELL)),
        ),
    );
    return;
  }

  // Hashed build assets + the runtime HDR/icon: stale-while-revalidate.
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/hdr/") ||
    url.pathname === "/icon.svg" ||
    url.pathname.startsWith("/fonts/")
  ) {
    event.respondWith(
      caches.open(CACHE).then((c) =>
        c.match(req).then((cached) => {
          const network = fetch(req)
            .then((res) => {
              if (res && res.status === 200) c.put(req, res.clone());
              return res;
            })
            .catch(() => cached);
          return cached || network;
        }),
      ),
    );
  }
});
