/* TukTuk24 Admin — push messaging service worker.
   This worker exists only to receive background push notifications.
   It never caches pages or assets. */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_) {
    payload = { title: "TukTuk24", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "TukTuk24 Admin";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/admin-icon-192.png",
    badge: "/admin-icon-192.png",
    tag: payload.tag || undefined,
    renotify: !!payload.tag,
    vibrate: [120, 60, 120],
    requireInteraction: !!payload.requireInteraction,
    data: { url: payload.url || "/admin" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/admin";

  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of all) {
        if (client.url.includes("/admin")) {
          await client.focus();
          if ("navigate" in client) {
            try {
              await client.navigate(target);
            } catch (_) {
              /* ignore */
            }
          }
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});
