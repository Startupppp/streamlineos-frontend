self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data;
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: "StreamlineOS", body: event.data.text() };
  }

  const options = {
    body: data.body,
    icon: data.icon || "/logo.svg",
    badge: data.badge || "/logo.svg",
    data: { url: data.url || "/notifications" },
  };
  if (data.tag) {
    options.tag = data.tag;
    options.renotify = true;
  }

  event.waitUntil(self.registration.showNotification(data.title || "StreamlineOS", options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/notifications";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      return clients.openWindow(targetUrl);
    }),
  );
});
