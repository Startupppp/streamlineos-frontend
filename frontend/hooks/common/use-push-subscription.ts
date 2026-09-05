"use client";
import { useCallback, useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export type PushPermissionState =
  | "unsupported"
  | "default"
  | "granted"
  | "denied";

const OPT_OUT_KEY = "streamline.push.opted-out";

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
  const [permission, setPermission] =
    useState<PushPermissionState>("unsupported");
  const [isEnabling, setIsEnabling] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [optedOut, setOptedOut] = useState(false);

  const { mutate: registerPushSubscription } = useMutation({
    mutationFn: ({
      endpoint,
      p256dh,
      auth,
    }: {
      endpoint: string;
      p256dh: string;
      auth: string;
    }) =>
      apiClient.post("/push/subscribe", {
        endpoint,
        p256dh,
        auth,
        userAgent: navigator.userAgent.slice(0, 255),
      }),
    onSuccess: () => setIsSubscribed(true),
  });

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const readPermission = () => setPermission(Notification.permission);
    readPermission();
    setOptedOut(readOptOut());

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
  //
  // RT-005. `optedOut` is what makes the disable control durable. Turning push off
  // removes the browser's PushSubscription, so without a remembered opt-out the very
  // next mount saw `getSubscription() === null`, minted a fresh one and posted it —
  // the user's choice survived until they navigated. The flag is per browser, which
  // is the same grain as the subscription it governs.
  useEffect(() => {
    if (!userId || typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (permission !== "granted" || optedOut) return;
    void subscribe()
      .then(() => setIsSubscribed(true))
      .catch(() => undefined);
  }, [userId, permission, optedOut]);

  /**
   * RT-005. The other half of `pushsubscriptionchange`. The service worker holds
   * no backend JWT, so it mints the replacement subscription and posts it to its
   * clients; persisting it is the page's job. Without this listener the rotation
   * is still lost — the worker would announce a new endpoint nobody records.
   */
  useEffect(() => {
    if (!userId || typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    const container = navigator.serviceWorker;
    if (typeof container.addEventListener !== "function") return;

    const handleWorkerMessage = (event: MessageEvent) => {
      if (optedOut || !isSubscriptionChangedMessage(event.data)) return;
      const { endpoint, p256dh, auth } = event.data;
      registerPushSubscription({ endpoint, p256dh, auth });
    };

    container.addEventListener("message", handleWorkerMessage);
    return () => container.removeEventListener("message", handleWorkerMessage);
  }, [userId, optedOut, registerPushSubscription]);

  const enable = useCallback(async (): Promise<PushPermissionState> => {
    if (typeof window === "undefined" || !("Notification" in window))
      return "unsupported";
    setIsEnabling(true);
    try {
      writeOptOut(false);
      setOptedOut(false);
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === "granted") {
        await subscribe();
        setIsSubscribed(true);
      }
      return result;
    } catch {
      return Notification.permission;
    } finally {
      setIsEnabling(false);
    }
  }, []);

  /**
   * RT-005. The counterpart the app never had. `POST /push/subscribe` had a
   * `DELETE /push/subscribe` beside it on the backend with no caller anywhere in
   * the frontend, so a user who wanted push off had exactly two options: revoke
   * the permission in browser site settings — which is effectively permanent and
   * cannot be undone from the app — or keep receiving it. Dropping the browser
   * subscription first and telling the server second is the safe order: if the
   * DELETE fails the row is orphaned, and the next send gets a 404/410 from the
   * push service, which `web-push.service.ts` already reaps.
   */
  const disable = useCallback(async (): Promise<void> => {
    setIsDisabling(true);
    try {
      writeOptOut(true);
      setOptedOut(true);
      await unsubscribeFromPush();
      setIsSubscribed(false);
    } finally {
      setIsDisabling(false);
    }
  }, []);

  return {
    permission,
    enable,
    disable,
    isEnabling,
    isDisabling,
    isSubscribed,
    optedOut,
  };
}

interface PushSubscriptionChangedMessage {
  type: "push-subscription-changed";
  endpoint: string;
  p256dh: string;
  auth: string;
}

function isSubscriptionChangedMessage(
  value: unknown,
): value is PushSubscriptionChangedMessage {
  if (typeof value !== "object" || value === null) return false;
  if (!("type" in value) || value.type !== "push-subscription-changed")
    return false;
  if (!("endpoint" in value) || typeof value.endpoint !== "string")
    return false;
  if (!("p256dh" in value) || typeof value.p256dh !== "string") return false;
  if (!("auth" in value) || typeof value.auth !== "string") return false;
  return true;
}

function readOptOut(): boolean {
  try {
    return window.localStorage.getItem(OPT_OUT_KEY) === "1";
  } catch {
    return false;
  }
}

function writeOptOut(value: boolean): void {
  try {
    if (value) window.localStorage.setItem(OPT_OUT_KEY, "1");
    else window.localStorage.removeItem(OPT_OUT_KEY);
  } catch {
    return;
  }
}

async function queryNotificationPermission(): Promise<
  PermissionStatus | undefined
> {
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

async function unsubscribeFromPush(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.register("/sw.js");
  const existing = await registration.pushManager.getSubscription();
  if (existing === null) return;
  const endpoint = existing.endpoint;
  await existing.unsubscribe();
  await apiClient.delete(
    `/push/subscribe?endpoint=${encodeURIComponent(endpoint)}`,
  );
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
