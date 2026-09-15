"use client";
import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";

export type PushPermissionState =
  | "unsupported"
  | "default"
  | "granted"
  | "denied";

const pushSubscribeContract = lazyContract(() =>
  import("@/hooks/common/push-schema").then((m) => m.pushSubscribeContract),
);
const pushUnsubscribeContract = lazyContract(() =>
  import("@/hooks/common/push-schema").then((m) => m.pushUnsubscribeContract),
);
const vapidPublicKeyContract = lazyContract(() =>
  import("@/hooks/common/push-schema").then((m) => m.vapidPublicKeyContract),
);

const OPT_OUT_KEY = "streamline.push.opted-out";
const registrationByContainer = new WeakMap<
  ServiceWorkerContainer,
  Map<string, Promise<void>>
>();
const rotationByContainer = new WeakMap<
  ServiceWorkerContainer,
  Map<string, { endpoint: string; request: Promise<void> }>
>();

export function usePushSubscription(userId: string | undefined) {
  const [permission, setPermission] =
    useState<PushPermissionState>("unsupported");
  const [isEnabling, setIsEnabling] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [optedOut, setOptedOut] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const readPermission = () => {
      const nextPermission = Notification.permission;
      if (nextPermission !== "granted" && userId)
        clearSubscriptionRegistration(userId);
      setPermission(nextPermission);
    };
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
    void subscribeOnce(userId)
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
      void persistRotationOnce(userId, event.data)
        .then(() => setIsSubscribed(true))
        .catch(() => undefined);
    };

    container.addEventListener("message", handleWorkerMessage);
    return () => container.removeEventListener("message", handleWorkerMessage);
  }, [userId, optedOut]);

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
        if (userId) await subscribeOnce(userId);
        else await subscribe();
        setIsSubscribed(true);
      }
      return result;
    } catch {
      return Notification.permission;
    } finally {
      setIsEnabling(false);
    }
  }, [userId]);

  const disable = useCallback(async (): Promise<void> => {
    setIsDisabling(true);
    try {
      writeOptOut(true);
      setOptedOut(true);
      if (userId) clearSubscriptionRegistration(userId);
      await unsubscribeFromPush();
      setIsSubscribed(false);
    } finally {
      setIsDisabling(false);
    }
  }, [userId]);

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

async function subscribe(): Promise<void> {
  const registration = await navigator.serviceWorker.register("/sw.js");
  const existing = await registration.pushManager.getSubscription();
  const sub = existing ?? (await createSubscription(registration));
  if (sub === null) return;

  const { p256dh, auth } = sub.toJSON().keys ?? {};
  if (p256dh === undefined || auth === undefined) return;

  await apiClient.post(
    "/push/subscribe",
    {
      endpoint: sub.endpoint,
      p256dh,
      auth,
      userAgent: navigator.userAgent.slice(0, 255),
    },
    undefined,
    pushSubscribeContract,
  );
}

function subscribeOnce(userId: string): Promise<void> {
  const container = navigator.serviceWorker;
  let registrations = registrationByContainer.get(container);
  if (!registrations) {
    registrations = new Map();
    registrationByContainer.set(container, registrations);
  }
  const active = registrations.get(userId);
  if (active) return active;

  const registration = subscribe().catch((error: unknown) => {
    registrations.delete(userId);
    throw error;
  });
  registrations.set(userId, registration);
  return registration;
}

function clearSubscriptionRegistration(userId: string): void {
  registrationByContainer.get(navigator.serviceWorker)?.delete(userId);
}

function persistRotationOnce(
  userId: string,
  subscription: PushSubscriptionChangedMessage,
): Promise<void> {
  const container = navigator.serviceWorker;
  let rotations = rotationByContainer.get(container);
  if (!rotations) {
    rotations = new Map();
    rotationByContainer.set(container, rotations);
  }
  const active = rotations.get(userId);
  if (active?.endpoint === subscription.endpoint) return active.request;

  const registration = apiClient
    .post(
      "/push/subscribe",
      {
        endpoint: subscription.endpoint,
        p256dh: subscription.p256dh,
        auth: subscription.auth,
        userAgent: navigator.userAgent.slice(0, 255),
      },
      undefined,
      pushSubscribeContract,
    )
    .then(() => undefined)
    .catch((error: unknown) => {
      if (rotations.get(userId)?.endpoint === subscription.endpoint)
        rotations.delete(userId);
      throw error;
    });
  rotations.set(userId, {
    endpoint: subscription.endpoint,
    request: registration,
  });
  return registration;
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
    undefined,
    undefined,
    pushUnsubscribeContract,
  );
}

async function createSubscription(
  registration: ServiceWorkerRegistration,
): Promise<PushSubscription | null> {
  const data = await apiClient.get<{ key: string }>(
    "/push/vapid-public-key",
    undefined,
    undefined,
    vapidPublicKeyContract,
  );
  if (!data.key) return null;
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(data.key),
  });
}

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
