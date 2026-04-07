# Task 20: Desktop Push Notifications (Web Push API)

## Priority: HIGH | Effort: 2-3 days | Dependencies: Task 06 (Redis) | Status: NOT STARTED

---

## PRD

### Problem Statement
Currently notifications are only in-app (notification bell). Users miss important alerts when:
1. Browser tab is in background
2. User is working in another application
3. Browser is minimized
4. Critical events need immediate attention (SLA breach, approval requests)

### Goals
- Implement Web Push API for native desktop notifications
- Show notifications even when browser tab is not active
- Support Chrome, Firefox, Edge, Safari (where available)
- Allow users to enable/disable push notifications
- Respect Do Not Disturb hours

### Non-Goals
- Mobile push (no native app)
- Browser-specific notification center integration
- Notification sounds (browser default only)

### Success Criteria
- Push notifications appear on desktop within 5 seconds of event
- Users can enable/disable in settings
- Service worker handles push events reliably
- Works across major browsers

---

## Implementation Steps

### 20.1 Generate VAPID Keys

```bash
npx web-push generate-vapid-keys
```

Add to `.env`:
```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@vaivamm.com
```

### 20.2 Install Dependencies

```bash
pnpm add web-push
pnpm add -D @types/web-push
```

### 20.3 Create Service Worker

**File**: `public/sw.js`
```javascript
self.addEventListener("push", function (event) {
  const data = event.data?.json() ?? {};
  const title = data.title || "Vaivamm Capital";
  const options = {
    body: data.body || "You have a new notification",
    icon: "/icon.svg",
    badge: "/badge-icon.png",
    tag: data.tag || "default",
    renotify: data.renotify || false,
    requireInteraction: data.requireInteraction || false,
    data: {
      url: data.url || "/",
      notificationId: data.notificationId,
    },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus().then((c) => c.navigate(url));
        }
      }
      return clients.openWindow(url);
    })
  );
});

self.addEventListener("notificationclose", function (event) {
  const notificationId = event.notification.data?.notificationId;
  if (notificationId) {
    fetch("/api/notifications/dismissed", {
      method: "POST",
      body: JSON.stringify({ notificationId }),
      headers: { "Content-Type": "application/json" },
    });
  }
});
```

### 20.4 Web Push Utility

**File**: `lib/web-push.ts`
```typescript
import webPush from "web-push";

webPush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  notificationId?: string;
  requireInteraction?: boolean;
}

export async function sendPushNotification(
  subscription: PushSubscriptionJSON,
  payload: PushPayload
): Promise<void> {
  try {
    await webPush.sendNotification(
      subscription as webPush.PushSubscription,
      JSON.stringify(payload)
    );
  } catch (error: unknown) {
    if (error instanceof webPush.WebPushError && error.statusCode === 410) {
      throw new Error("SUBSCRIPTION_EXPIRED");
    }
    throw error;
  }
}

export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<void> {
  const subscriptions = await db.query.pushSubscriptions.findMany({
    where: eq(pushSubscriptions.userId, userId),
  });

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      sendPushNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      )
    )
  );

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "rejected" && result.reason?.message === "SUBSCRIPTION_EXPIRED") {
      await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, subscriptions[i].id));
    }
  }
}
```

### 20.5 Push Subscription Hook

**File**: `hooks/use-push-notifications.ts`
```typescript
"use client";

import { useState, useEffect, useCallback } from "react";

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
      checkSubscription();
    } else {
      setIsLoading(false);
    }
  }, []);

  async function checkSubscription() {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch {
      setIsSubscribed(false);
    } finally {
      setIsLoading(false);
    }
  }

  const subscribe = useCallback(async () => {
    if (!isSupported) return { success: false, error: "Not supported" };

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== "granted") {
        return { success: false, error: "Permission denied" };
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      });

      const response = await fetch("/api/notifications/subscribe", {
        method: "POST",
        body: JSON.stringify(subscription.toJSON()),
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) throw new Error("Failed to save subscription");

      setIsSubscribed(true);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        await fetch("/api/notifications/unsubscribe", {
          method: "POST",
          body: JSON.stringify({ endpoint: subscription.endpoint }),
          headers: { "Content-Type": "application/json" },
        });
      }

      setIsSubscribed(false);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }, []);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
  };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
```

### 20.6 Subscribe API Route

**File**: `app/api/notifications/subscribe/route.ts`
```typescript
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { pushSubscriptions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subscription = await request.json();

  const existing = await db.query.pushSubscriptions.findFirst({
    where: and(
      eq(pushSubscriptions.userId, session.user.id),
      eq(pushSubscriptions.endpoint, subscription.endpoint)
    ),
  });

  if (!existing) {
    await db.insert(pushSubscriptions).values({
      id: nanoid(),
      userId: session.user.id,
      orgId: session.user.orgId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    });
  }

  return NextResponse.json({ success: true });
}
```

### 20.7 Push Permission Prompt Component

**File**: `components/shared/push-notification-prompt.tsx`
```typescript
"use client";

import { Button } from "@/components/ui/button";
import { Bell, X } from "lucide-react";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { useState } from "react";

export function PushNotificationPrompt() {
  const { isSupported, isSubscribed, permission, subscribe } = usePushNotifications();
  const [isDismissed, setIsDismissed] = useState(false);

  if (!isSupported || isSubscribed || permission === "denied" || isDismissed) {
    return null;
  }

  async function handleEnable() {
    const result = await subscribe();
    if (!result.success) {
      console.error("Failed to enable push:", result.error);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border bg-card p-4 shadow-lg">
      <Bell className="h-5 w-5 text-primary" />
      <div className="flex-1">
        <p className="text-sm font-medium">Enable desktop notifications</p>
        <p className="text-xs text-muted-foreground">
          Get alerts for important updates
        </p>
      </div>
      <Button size="sm" onClick={handleEnable}>
        Enable
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setIsDismissed(true)}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
```

### 20.8 Integrate with Notification Service

**File**: `lib/notifications/send.ts` (update existing)
```typescript
import { sendPushToUser } from "@/lib/web-push";

export async function sendNotification(params: {
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
}) {
  await db.insert(notifications).values({
    id: nanoid(),
    userId: params.userId,
    type: params.type,
    title: params.title,
    message: params.message,
    link: params.link,
    isRead: false,
    createdAt: new Date(),
  });

  const prefs = await db.query.notificationPreferences.findFirst({
    where: and(
      eq(notificationPreferences.userId, params.userId),
      eq(notificationPreferences.eventType, params.type)
    ),
  });

  if (prefs?.push !== false) {
    await sendPushToUser(params.userId, {
      title: params.title,
      body: params.message,
      url: params.link,
      notificationId: params.userId,
    });
  }
}
```

---

## Checklist

- [ ] Generate VAPID keys
- [ ] Add VAPID keys to environment variables
- [ ] Install `web-push` package
- [ ] Create service worker (`public/sw.js`)
- [ ] Create `lib/web-push.ts` utility
- [ ] Create `usePushNotifications` hook
- [ ] Create subscribe API endpoint
- [ ] Create unsubscribe API endpoint
- [ ] Create push notification prompt component
- [ ] Add prompt to dashboard layout
- [ ] Update notification send function to include push
- [ ] Add push toggle to notification settings
- [ ] Create `push_subscriptions` table (Task 02)
- [ ] Test in Chrome
- [ ] Test in Firefox
- [ ] Test in Edge
- [ ] Test notification click navigation
- [ ] Handle expired subscriptions cleanup
- [ ] `pnpm build` passes

## Acceptance Criteria

1. Desktop notification appears when event triggers
2. Clicking notification opens correct page
3. Users can enable/disable push in settings
4. Works in Chrome, Firefox, Edge
5. Expired subscriptions auto-cleaned
6. Service worker persists across page reloads

## Testing Plan

1. Enable push, trigger lead assignment, verify desktop notification
2. Click notification, verify navigation to lead detail
3. Disable push in settings, trigger event, verify no notification
4. Close browser, trigger event via API, verify notification on reopen
5. Test across Chrome, Firefox, Edge
