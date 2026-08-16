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

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    setPermission(Notification.permission as PushPermissionState);
  }, [userId]);

  // Registering the worker and re-subscribing is silent and never prompts, so it can
  // run on mount — an already-granted user keeps receiving push with no interaction.
  useEffect(() => {
    if (!userId || typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    void subscribe().catch(() => undefined);
  }, [userId]);

  const enable = useCallback(async (): Promise<PushPermissionState> => {
    if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
    setIsEnabling(true);
    try {
      const result = (await Notification.requestPermission()) as PushPermissionState;
      setPermission(result);
      if (result === "granted") await subscribe();
      return result;
    } catch {
      return Notification.permission as PushPermissionState;
    } finally {
      setIsEnabling(false);
    }
  }, []);

  return { permission, enable, isEnabling };
}

async function subscribe(): Promise<void> {
  const registration = await navigator.serviceWorker.register("/sw.js");
  const existing = await registration.pushManager.getSubscription();
  if (existing) return;

  const data = await apiClient.get<{ key: string }>("/push/vapid-public-key");
  if (!data.key) return;

  const sub = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(data.key),
  });
  const json = sub.toJSON();
  if (!json.keys) return;

  await apiClient.post("/push/subscribe", {
    endpoint: sub.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
    userAgent: navigator.userAgent.slice(0, 255),
  });
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output.buffer as ArrayBuffer;
}
