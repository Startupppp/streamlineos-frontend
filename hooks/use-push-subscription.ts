"use client";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";

export function usePushSubscription() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then(async (registration) => {
        const existing = await registration.pushManager.getSubscription();
        if (existing) return; // Already subscribed

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
      })
      .catch(() => {
        /* Service worker registration failed silently */
      });
  }, [status]);
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
