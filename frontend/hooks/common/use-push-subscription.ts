"use client";
import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";

export type PushPermissionState = "unsupported" | "default" | "granted" | "denied";

/**
 * RT-003/004. This used to call `Notification.requestPermission()` inside an effect on
 * mount, so the browser prompt appeared the instant the authenticated shell loaded —
 * before the user had seen a single notification or any reason to want one. On most
 * browsers a denial is effectively permanent and cannot be re-prompted, so that spent
 * the one attempt each user ever gets, at the worst possible moment.
 *
 * The hook now only *reports* permission and subscribes users who already granted it.
 * Asking is a separate, explicit action the UI triggers from a user gesture, once it
 * has something worth offering — that is `enable()`.
 */
export function usePushSubscription(userId: string | undefined) {
  const [permission, setPermission] = useState<PushPermissionState>("unsupported");
  const [isEnabling, setIsEnabling] = useState(false);

  /**
   * Permission is not something we can read once. A user revokes it from browser
   * site settings with the tab still open, and nothing tells the tab unless it
   * subscribes — so a single read on mount left the card claiming "Push
   * notifications are on" for the rest of the session, and the denied branch it
   * already renders could never be reached after mount. The Permissions API is
   * the live signal; the visibility re-read is the fallback for browsers that
   * reject `notifications` there, and it also catches a change made in another
   * tab or in OS settings.
   */
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const readPermission = () => setPermission(Notification.permission);
    readPermission();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") readPermission();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    let status: PermissionStatus | undefined;
    let released = false;
    void queryNotificationPermission().then((result) => {
      if (result === undefined || released) return;
      status = result;
      result.addEventListener("change", readPermission);
    });

    return () => {
      released = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      status?.removeEventListener("change", readPermission);
    };
  }, [userId]);

  // Registering the worker and re-subscribing is silent and never prompts, so it can
  // run on mount — an already-granted user keeps receiving push with no interaction.
  // Keyed on `permission` as well, so granting from browser settings takes effect
  // without a reload.
  useEffect(() => {
    if (!userId || typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (permission !== "granted") return;
    void subscribe().catch(() => undefined);
  }, [userId, permission]);

  const enable = useCallback(async (): Promise<PushPermissionState> => {
    if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
    setIsEnabling(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === "granted") await subscribe();
      return result;
    } catch {
      return Notification.permission;
    } finally {
      setIsEnabling(false);
    }
  }, []);

  return { permission, enable, isEnabling };
}

async function queryNotificationPermission(): Promise<PermissionStatus | undefined> {
  if (!("permissions" in navigator)) return undefined;
  try {
    return await navigator.permissions.query({ name: "notifications" });
  } catch {
    return undefined;
  }
}

/**
 * The POST is unconditional, and that is the repair rather than an extra request.
 * The server deletes a subscription row whenever the push service answers 404 or
 * 410 (`web-push.service.ts`), and the row also cascades away with the
 * membership it points at. In every one of those cases the browser still holds a
 * live `PushSubscription`, so the previous `if (existing) return` meant the
 * client could never tell the server about it again: the subscription was dead
 * server-side, unrepairable, and the card still said push was on. Writing it back
 * on each mount is idempotent — the endpoint upserts on the endpoint — and is the
 * only path back.
 */
async function subscribe(): Promise<void> {
  const registration = await navigator.serviceWorker.register("/sw.js");
  const existing = await registration.pushManager.getSubscription();
  const sub = existing ?? (await createSubscription(registration));
  if (sub === null) return;

  const { p256dh, auth } = sub.toJSON().keys ?? {};
  if (p256dh === undefined || auth === undefined) return;

  await apiClient.post("/push/subscribe", {
    endpoint: sub.endpoint,
    p256dh,
    auth,
    userAgent: navigator.userAgent.slice(0, 255),
  });
}

async function createSubscription(
  registration: ServiceWorkerRegistration,
): Promise<PushSubscription | null> {
  const data = await apiClient.get<{ key: string }>("/push/vapid-public-key");
  if (!data.key) return null;
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(data.key),
  });
}

// Returns the view rather than `.buffer`: `applicationServerKey` takes a
// BufferSource, and `Uint8Array` is one, which is what removes the last forced
// type here — `.buffer` is `ArrayBufferLike` and only an assertion made it fit.
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}
