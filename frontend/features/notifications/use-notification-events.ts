"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";
import { consumeNotificationStream, type IncomingNotification } from "./notification-event-stream";
import { withCorrelation } from "@/lib/observability/with-correlation";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
/**
 * The attempt at which the exponential backoff reaches its ceiling — NOT a point
 * at which reconnecting stops. It used to be the latter, so five transient
 * failures over a long-lived tab permanently ended live notifications for that
 * session with nothing on screen to say so. An SSE consumer that gives up is
 * indistinguishable to the user from a backend that has stopped sending.
 */
const BACKOFF_CEILING_ATTEMPT = 5;
const MAX_BACKOFF_MS = 30_000;

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
      headers: withCorrelation(new Headers({ Authorization: `Bearer ${backendJwt}` })),
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
      if (controller.signal.aborted) return;
      if (retryTimer) clearTimeout(retryTimer);
      retryCount += 1;
      const attempt = Math.min(retryCount, BACKOFF_CEILING_ATTEMPT);
      const delay = Math.min(MAX_BACKOFF_MS, 1_000 * 2 ** attempt) + Math.floor(Math.random() * 500);
      retryTimer = setTimeout(() => void connect(), delay);
    };

    const connect = async (): Promise<void> => {
      if (controller.signal.aborted) return;
      const token = await fetchStreamToken();
      if (controller.signal.aborted) return;
      // `fetchStreamToken` swallows every failure into null — a 502 from
      // /api/auth/session, a network blip, a rate-limited POST to the token route.
      // Returning here without arming a retry is what made ONE such failure end the
      // stream for the life of the page.
      if (!token) {
        scheduleRetry();
        return;
      }
      try {
        await consumeNotificationStream(
          `${BACKEND_URL}/notifications/events`,
          token,
          controller.signal,
          (notification) => {
            invalidate();
            showIncoming(notification, router);
          },
          // Reset on CONNECT, not on the first notification: a healthy stream is
          // quiet most of the time, so resetting on arrival carried old failures
          // forward across reconnects that had all succeeded.
          () => {
            retryCount = 0;
          },
        );
        scheduleRetry();
      } catch {
        scheduleRetry();
      }
    };

    // Coming back from an offline stretch is the one moment a reconnect is both
    // free and certain to be needed; without it the tab waits out whatever backoff
    // it had reached when the network went away.
    const reconnectNow = () => {
      if (controller.signal.aborted) return;
      retryCount = 0;
      if (retryTimer) clearTimeout(retryTimer);
      void connect();
    };
    window.addEventListener("online", reconnectNow);

    void connect();
    return () => {
      controller.abort();
      window.removeEventListener("online", reconnectNow);
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [orgId, queryClient, router, status]);
}
