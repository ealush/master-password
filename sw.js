const CACHE_KEY_PREFIX = "PW_CACHE";
const VERSION = 24;
const CACHE_KEY = `${CACHE_KEY_PREFIX}_${VERSION}`;

self.addEventListener("install", self.skipWaiting);

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(event.request).then((response) =>
        caches.open(CACHE_KEY).then((cache) => {
          cache.put(event.request, response.clone());
          return response;
        })
      );
    })
  );
});

onActivate = (e) => e.waitUntil(handleActivation());

self.addEventListener("activate", (e) => {
  e.waitUntil(
    clearCache()
      .then(() => clients.claim())
      .then(() => self.skipWaiting())
  );
});

const clearCache = async () => {
  const keys = await caches.keys();
  keys.forEach((key) => {
    if (key.startsWith(CACHE_KEY_PREFIX) && key !== CACHE_KEY) {
      caches.delete(key);
    }
  });
};

self.addEventListener("message", async (e) => {
  const clientId = e.source.id;

  const result = await hash(e.data);

  const allClients = await clients.matchAll();
  allClients
    .filter((client) => clientId === client.id)
    .forEach(async (client) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = onmessage;
      client.postMessage(result, [channel.port2]);
    });
});

const hash = async (value) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(value.join());
  const buffer = await crypto.subtle.digest("SHA-512", data);
  return btoa(
    Array.from(new Uint8Array(buffer))
      .map((buff) => buff.toString(35).padStart(2, "0"))
      .join("")
  ).substr(0, value[0]);
};
