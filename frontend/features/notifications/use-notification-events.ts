"use client";

import { useEffect, useRef } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { invalidateNotificationInbox } from "@/hooks/api/notifications-shared";
import {
  consumeNotificationStream,
  type IncomingNotification,
} from "./notification-event-stream";
import { withCorrelation } from "@/lib/observability/with-correlation";
import { getBackendToken } from "@/lib/api-client";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

const BACKOFF_CEILING_ATTEMPT = 5;
const MAX_BACKOFF_MS = 30_000;

type AppRouter = ReturnType<typeof useRouter>;

interface ActiveStream {
  orgId: string;
  subscribers: number;
  controller: AbortController;
  release: () => void;
}

let activeStream: ActiveStream | null = null;
let cachedToken: string | null = null;
let tokenFetchedAt = 0;
const TOKEN_CACHE_MS = 55 * 60_000;

async function fetchStreamToken(): Promise<string | null> {
  const now = Date.now();
  if (cachedToken !== null && now - tokenFetchedAt < TOKEN_CACHE_MS)
    return cachedToken;
  try {
    const backendJwt = await getBackendToken();
    if (!backendJwt) return null;
    const response = await fetch(`${BACKEND_URL}/notifications/events/token`, {
      method: "POST",
      headers: withCorrelation(
        new Headers({ Authorization: `Bearer ${backendJwt}` }),
      ),
    });
    if (!response.ok) return null;
    const body: unknown = await response.json();
    if (typeof body !== "object" || body === null || !("token" in body))
      return null;
    const token = typeof body.token === "string" ? body.token : null;
    if (token !== null) {
      cachedToken = token;
      tokenFetchedAt = Date.now();
    }
    return token;
  } catch {
    return null;
  }
}

function showIncoming(
  notification: IncomingNotification,
  router: AppRouter,
): void {
  if (notification.priority === "LOW") return;
  const openLink = () => {
    if (notification.link) router.push(notification.link);
  };
  toast(notification.title, {
    description: notification.message,
    ...(notification.link
      ? { action: { label: "View", onClick: openLink } }
      : {}),
  });
}

function openStream(
  orgId: string,
  queryClientRef: { current: QueryClient },
  routerRef: { current: AppRouter },
): ActiveStream {
  const controller = new AbortController();
  let retryCount = 0;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;

  const invalidate = () => invalidateNotificationInbox(queryClientRef.current);

  const scheduleRetry = () => {
    if (controller.signal.aborted) return;
    if (retryTimer) clearTimeout(retryTimer);
    retryCount += 1;
    const attempt = Math.min(retryCount, BACKOFF_CEILING_ATTEMPT);
    const delay =
      Math.min(MAX_BACKOFF_MS, 1_000 * 2 ** attempt) +
      Math.floor(Math.random() * 500);
    retryTimer = setTimeout(() => void connect(), delay);
  };

  const connect = async (): Promise<void> => {
    if (controller.signal.aborted) return;
    const token = await fetchStreamToken();
    if (controller.signal.aborted) return;
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
          showIncoming(notification, routerRef.current);
        },
        () => {
          retryCount = 0;
        },
      );
      scheduleRetry();
    } catch {
      scheduleRetry();
    }
  };

  const reconnectNow = () => {
    if (controller.signal.aborted) return;
    retryCount = 0;
    if (retryTimer) clearTimeout(retryTimer);
    void connect();
  };
  window.addEventListener("online", reconnectNow);

  void connect();

  return {
    orgId,
    subscribers: 0,
    controller,
    release: () => {
      controller.abort();
      window.removeEventListener("online", reconnectNow);
      if (retryTimer) clearTimeout(retryTimer);
      cachedToken = null;
      tokenFetchedAt = 0;
    },
  };
}

export function useNotificationEvents(): void {
  const queryClient = useQueryClient();
  const { data: session, status } = useSession();
  const router = useRouter();
  const orgId = session?.orgId;

  const queryClientRef = useRef(queryClient);
  queryClientRef.current = queryClient;
  const routerRef = useRef(router);
  routerRef.current = router;

  useEffect(() => {
    if (status !== "authenticated" || !orgId) return;
    if (activeStream && activeStream.orgId !== orgId) {
      activeStream.release();
      activeStream = null;
    }
    const stream = activeStream ?? openStream(orgId, queryClientRef, routerRef);
    activeStream = stream;
    stream.subscribers += 1;
    return () => {
      stream.subscribers -= 1;
      if (stream.subscribers > 0 || activeStream !== stream) return;
      stream.release();
      activeStream = null;
    };
  }, [orgId, status]);
}
