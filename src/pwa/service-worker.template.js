/* Job Ranger web runtime service worker (generated at build time).
 *
 * Scope of responsibility: the versioned application shell ONLY.
 * - It never reads, stores, or proxies career data (that lives in the
 *   origin-private file system, owned by the runtime worker).
 * - It never intercepts cross-origin requests.
 * - Every shell asset is verified against the build's SHA-256 manifest before
 *   a version is installed; any mismatch aborts the install and the previous
 *   version keeps running.
 * - A new version waits until the user chooses to reload (SKIP_WAITING).
 */
const BUILD_ID = "__JOB_RANGER_BUILD_ID__";
const ASSETS = __JOB_RANGER_PRECACHE__;
const CACHE_PREFIX = "job-ranger-shell-";
const CACHE_NAME = `${CACHE_PREFIX}${BUILD_ID}`;

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        for (const asset of ASSETS) {
          const url = new URL(asset.path, self.registration.scope).toString();
          const response = await fetch(url, { cache: "reload", credentials: "same-origin" });
          if (!response.ok) throw new Error(`Shell asset ${asset.path} returned HTTP ${response.status}`);
          const digest = toHex(await crypto.subtle.digest("SHA-256", await response.clone().arrayBuffer()));
          if (digest !== asset.sha256) {
            throw new Error(`Shell asset ${asset.path} does not match build ${BUILD_ID}`);
          }
          await cache.put(url, response);
        }
      } catch (error) {
        await caches.delete(CACHE_NAME);
        throw error;
      }
      // First installation activates immediately; updates wait for the user.
      if (!self.registration.active) await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data && event.data.type === "GET_BUILD_ID" && event.ports[0]) {
    event.ports[0].postMessage({ buildId: BUILD_ID });
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith("/sw.js")) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      if (request.mode === "navigate") {
        const page = await cache.match(request, { ignoreSearch: true });
        if (page) return page;
        const shell = await cache.match(new URL("index.html", self.registration.scope).toString());
        if (shell) return shell;
        return fetch(request);
      }
      const cached = await cache.match(request, { ignoreSearch: true });
      return cached || fetch(request);
    })(),
  );
});
