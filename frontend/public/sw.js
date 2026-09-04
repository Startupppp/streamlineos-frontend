self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// RT-001. The payload carries an id, a category and a url — never record content.
// All user-facing copy is generated here from the category, so nothing sensitive
// can reach a lock screen or the OS notification log even if a caller regresses.
const CATEGORY_TITLES = {
  CHAT: "New message",
  SECURITY: "Security alert",
  BILLING: "Billing update",
  PAYROLL: "Payroll update",
  ACCOUNTING: "Accounting update",
  HRMS: "HR update",
  RECRUITMENT: "Recruitment update",
  PROJECTS: "Project update",
  CRM: "CRM update",
  KNOWLEDGE: "Knowledge Base update",
  SUPPORT: "Support update",
  INVENTORY: "Inventory update",
  CALENDAR: "Calendar update",
  SURVEYS: "Survey update",
  WORKFLOW: "Approval needed",
  SIGN: "Signature request",
  MARKETING: "Marketing update",
  AI: "AI update",
  SYSTEM: "StreamlineOS",
};

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    data = {};
  }

  const title = CATEGORY_TITLES[data.category] || "New notification";
  const options = {
    body: "Open StreamlineOS to view",
    icon: "/logo.svg",
    badge: "/logo.svg",
    data: { url: data.url || "/notifications" },
  };

  // RT-002: one notification per event, not one per open tab. The service worker
  // is shared across tabs, so tagging by notification id collapses duplicates at
  // the OS level.
  if (data.notificationId) {
    options.tag = `notif-${data.notificationId}`;
    options.renotify = false;
  }

  event.waitUntil(self.registration.showNotification(title, options));
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

// RT-005. Browsers rotate a push subscription without asking: an expiring VAPID
// key, a storage eviction, a push-service migration. The event that announces it
// is `pushsubscriptionchange`, and this worker had no listener for it — so the
// old endpoint went dead, the row on the server kept being sent to until the push
// service answered 410, and nothing re-registered until the user happened to open
// a tab. The worker cannot call the API itself (the backend JWT is minted in the
// page, not here), so it does the half only it can do — mint the replacement
// subscription immediately, with the same application server key — and hands it
// to every open client, which persists it. With no client open the page's own
// mount-time POST is still the backstop, but the subscription now already exists
// by then instead of being minted a page load late.
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(renewPushSubscription(event));
});

async function renewPushSubscription(event) {
  const previous = event.oldSubscription || null;
  let next = await self.registration.pushManager.getSubscription();
  if (!next) {
    const applicationServerKey =
      (event.newSubscription && event.newSubscription.options && event.newSubscription.options.applicationServerKey) ||
      (previous && previous.options && previous.options.applicationServerKey) ||
      null;
    if (!applicationServerKey) return;
    next = await self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
  }
  if (!next) return;

  const keys = (next.toJSON() || {}).keys || {};
  if (!keys.p256dh || !keys.auth) return;

  const windowClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const client of windowClients) {
    client.postMessage({
      type: "push-subscription-changed",
      endpoint: next.endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      oldEndpoint: previous ? previous.endpoint : null,
    });
  }
}
