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
