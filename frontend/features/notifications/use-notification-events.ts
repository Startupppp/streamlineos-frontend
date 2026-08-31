"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";
import { consumeNotificationStream, type IncomingNotification } from "./notification-event-stream";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
const MAX_RETRIES = 5;

async function fetchStreamToken(): Promise<string | null> {
  try {
    const sessionRes = await fetch("/api/auth/session", { credentials: "include" });
    if (!sessionRes.ok) return null;
    const sessionData: unknown = await sessionRes.json();
    if (typeof sessionData !== "object" || sessionData === null || !("backendJwt" in sessionData)) return null;
    const backendJwt = sessionData.backendJwt;
    if (typeof backendJwt !== "string" || !backendJwt) return null;
    const response = await fetch(`${BACKEND_URL}/notifications/events/token`, {
      method: "POST",
      headers: { Authorization: `Bearer ${backendJwt}` },
    });
    if (!response.ok) return null;
    const body: unknown = await response.json();
    if (typeof body !== "object" || body === null || !("token" in body)) return null;
    return typeof body.token === "string" ? body.token : null;
  } catch {
    return null;
  }
}

function showIncoming(notification: IncomingNotification, router: ReturnType<typeof useRouter>): void {
  if (notification.priority === "LOW") return;
  const openLink = () => {
    if (notification.link) router.push(notification.link);
  };
  toast(notification.title, {
    description: notification.message,
    ...(notification.link ? { action: { label: "View", onClick: openLink } } : {}),
  });
}

export function useNotificationEvents(): void {
  const queryClient = useQueryClient();
  const { data: session, status } = useSession();
  const router = useRouter();
  const orgId = session?.orgId;

  useEffect(() => {
    if (status !== "authenticated" || !orgId) return;
    const controller = new AbortController();
    let retryCount = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const invalidate = () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount(), exact: true });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadList(), exact: true });
    };

    const scheduleRetry = () => {
      if (controller.signal.aborted || retryCount >= MAX_RETRIES) return;
      retryCount += 1;
      const delay = Math.min(30_000, 1_000 * 2 ** retryCount) + Math.floor(Math.random() * 500);
      retryTimer = setTimeout(() => void connect(), delay);
    };

    const connect = async (): Promise<void> => {
      if (controller.signal.aborted || retryCount > MAX_RETRIES) return;
      const token = await fetchStreamToken();
      if (!token || controller.signal.aborted) return;
      try {
        await consumeNotificationStream(`${BACKEND_URL}/notifications/events`, token, controller.signal, (notification) => {
          retryCount = 0;
          invalidate();
          showIncoming(notification, router);
        });
        scheduleRetry();
      } catch {
        scheduleRetry();
      }
    };

    void connect();
    return () => {
      controller.abort();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [orgId, queryClient, router, status]);
}
