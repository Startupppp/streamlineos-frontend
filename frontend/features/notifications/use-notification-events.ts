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

const BACKOFF_CEILING_ATTEMPT = 9;
const MAX_BACKOFF_MS = 5 * 60_000;
const STREAM_RELEASE_GRACE_MS = 5_000;

type AppRouter = ReturnType<typeof useRouter>;

interface ActiveStream {
  orgId: string;
  subscribers: number;
  controller: AbortController;
  releaseTimer?: ReturnType<typeof setTimeout>;
  release: () => void;
}

let activeStream: ActiveStream | null = null;
let tokenFetchPromise: Promise<string | null> | null = null;
let tokenFetchOrgId: string | null = null;
let tokenGeneration = 0;
let tokenRetryNotBefore = 0;

export function clearStreamToken(): void {
  if (activeStream) {
    activeStream.release();
    activeStream = null;
  }
  tokenFetchPromise = null;
  tokenFetchOrgId = null;
  tokenRetryNotBefore = 0;
  tokenGeneration += 1;
}

function retryAfterDelay(response: Response): number {
  const value = response.headers?.get("retry-after");
  if (!value) return 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);
  const date = Date.parse(value);
  return Number.isNaN(date) ? 0 : Math.max(0, date - Date.now());
}

async function mintStreamToken(): Promise<string | null> {
  const generation = tokenGeneration;
  try {
    if (Date.now() < tokenRetryNotBefore) return null;
    const backendJwt = await getBackendToken();
    if (!backendJwt) return null;
    const response = await fetch(`${BACKEND_URL}/notifications/events/token`, {
      method: "POST",
      headers: withCorrelation(
        new Headers({ Authorization: `Bearer ${backendJwt}` }),
      ),
    });
    if (!response.ok) {
      if (response.status === 429) {
        tokenRetryNotBefore = Date.now() + retryAfterDelay(response);
      }
      return null;
    }
    tokenRetryNotBefore = 0;
    const body: unknown = await response.json();
    if (typeof body !== "object" || body === null || !("token" in body))
      return null;
    const token = typeof body.token === "string" ? body.token : null;
    if (generation !== tokenGeneration) return null;
    return token;
  } catch {
    return null;
  } finally {
    if (generation === tokenGeneration) {
      tokenFetchPromise = null;
      tokenFetchOrgId = null;
    }
  }
}

function fetchStreamToken(orgId: string): Promise<string | null> {
  if (tokenFetchPromise !== null && tokenFetchOrgId === orgId)
    return tokenFetchPromise;
  tokenFetchOrgId = orgId;
  tokenFetchPromise = mintStreamToken();
  return tokenFetchPromise;
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
      Math.min(MAX_BACKOFF_MS, 1_000 * 2 ** (attempt - 1)) +
      Math.floor(Math.random() * 500);
    retryTimer = setTimeout(
      () => void connect(),
      Math.max(delay, tokenRetryNotBefore - Date.now()),
    );
  };

  const connect = async (): Promise<void> => {
    if (controller.signal.aborted) return;
    const token = await fetchStreamToken(orgId);
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
    },
  };
}

export function useNotificationEvents(): void {
  const queryClient = useQueryClient();
  const { data: session, status } = useSession();
  const router = useRouter();
  const orgId = session?.orgId;
  const streamOrgId = status === "unauthenticated" ? undefined : orgId;

  const queryClientRef = useRef(queryClient);
  const routerRef = useRef(router);

  useEffect(() => {
    queryClientRef.current = queryClient;
  }, [queryClient]);

  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  useEffect(() => {
    if (!streamOrgId) {
      clearStreamToken();
      return;
    }
    if (activeStream && activeStream.orgId !== streamOrgId) {
      activeStream.release();
      activeStream = null;
      clearStreamToken();
    }
    const stream =
      activeStream ?? openStream(streamOrgId, queryClientRef, routerRef);
    if (stream.releaseTimer) {
      clearTimeout(stream.releaseTimer);
      stream.releaseTimer = undefined;
    }
    activeStream = stream;
    stream.subscribers += 1;
    return () => {
      stream.subscribers -= 1;
      if (stream.subscribers > 0 || activeStream !== stream) return;
      stream.releaseTimer = setTimeout(() => {
        if (stream.subscribers > 0 || activeStream !== stream) return;
        stream.release();
        activeStream = null;
      }, STREAM_RELEASE_GRACE_MS);
    };
  }, [streamOrgId]);
}
