const CACHE_NAME = "verse-shell-1mbnf7f";
const APP_SHELL = ["/verse-demo/","/verse-demo/manifest.webmanifest","/verse-demo/icons/verse-mark.svg","/verse-demo/icons/verse-icon-192.png","/verse-demo/icons/verse-icon-512.png","/verse-demo/assets/index-CA2hT6fZ.js","/verse-demo/assets/index-U9XKTFti.css"];
const SHELL_ROOT = "/verse-demo/";
const SAFE_RUNTIME_PREFIXES = ["assets/", "icons/", "game/"].map((path) => SHELL_ROOT + path);
const PRIVATE_PATH_SEGMENTS = ["/api", "/auth", "/private", "/rest", "/rpc", "/functions", "/storage"];

function isPrivatePath(pathname) {
  return PRIVATE_PATH_SEGMENTS.some((segment) => (
    pathname === segment
    || pathname.startsWith(segment + "/")
    || pathname.includes(segment + "/")
  ));
}

function isPublicStaticPath(pathname) {
  return APP_SHELL.includes(pathname)
    || SAFE_RUNTIME_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function mayStore(response) {
  const cacheControl = response.headers.get("cache-control") || "";
  return response.ok && !/(?:^|,)\s*(?:private|no-store)(?:\s|,|$)/i.test(cacheControl);
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key.startsWith("verse-shell-") && key !== CACHE_NAME)
        .map((key) => caches.delete(key)),
    )),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET"
    || url.origin !== self.location.origin
    || request.headers.has("authorization")
    || isPrivatePath(url.pathname)) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (mayStore(response)) {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(SHELL_ROOT, copy)));
          }
          return response;
        })
        .catch(() => caches.match(SHELL_ROOT)),
    );
    return;
  }

  if (!isPublicStaticPath(url.pathname)) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached ?? fetch(request).then((response) => {
      if (mayStore(response)) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)));
      }
      return response;
    })),
  );
});
