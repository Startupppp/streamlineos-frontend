"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { invalidateNotificationInbox } from "@/hooks/api/notifications-shared";
import { consumeNotificationStream } from "./notification-event-stream";
import { clearBackendTokenCache, isImpersonating, request } from "@/lib/api-client";
import { lazyContract, parseApiResponse } from "@/lib/api-envelope";
import { expectedRequestIdentitySchema, type ExpectedRequestIdentity } from "@/lib/api-request-identity";
import { createNotificationToastHydration } from "@/lib/api/notification-toast-hydration";
import { useOrgStorageScope } from "@/lib/org-scoped-storage";
import { authenticatedScope } from "@/lib/query-scope";
import { normalizeBuildDeepLink } from "@/lib/build/normalize-build-deep-link";
import type { Notification } from "@/types/notifications";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
const MAX_BACKOFF_MS = 5 * 60_000;
const STREAM_RELEASE_GRACE_MS = 5_000;
const STREAM_STABLE_MS = 30_000;
const RATE_LIMITED_FALLBACK_MS = 60_000;
const tokenContract = lazyContract(() => import("@/hooks/api/notifications-schema").then((m) => m.notificationStreamTokenContract));
type AppRouter = ReturnType<typeof useRouter>;

interface StreamOwner {
  key: string;
  identity: ExpectedRequestIdentity;
  queryClient: QueryClient;
  router: AppRouter;
}
interface ActiveStream {
  ownerKey: string;
  subscribers: number;
  controller: AbortController;
  releaseTimer?: ReturnType<typeof setTimeout>;
  resume: () => void;
  release: () => void;
}

const committedOwners = new Map<symbol, StreamOwner>();
let selectedOwnerKey: string | null = null;
let activeStream: ActiveStream | null = null;
let tokenFetch: { ownerKey: string; promise: Promise<string | null> } | null = null;
let tokenGeneration = 0;
let tokenRetryNotBefore = 0;

function currentOwner(key: string) {
  return [...committedOwners.values()].find((owner) => owner.key === key);
}

export function clearStreamToken(): void {
  activeStream?.release();
  activeStream = null;
  tokenFetch = null;
  selectedOwnerKey = null;
  tokenRetryNotBefore = 0;
  tokenGeneration += 1;
}

function retryAfterDelay(response: Response): number {
  const value = response.headers?.get("retry-after");
  if (!value) return RATE_LIMITED_FALLBACK_MS;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);
  const date = Date.parse(value);
  return Number.isNaN(date) ? RATE_LIMITED_FALLBACK_MS : Math.max(0, date - Date.now());
}

async function mintStreamToken(owner: StreamOwner, signal: AbortSignal, valid: () => boolean): Promise<string | null> {
  const generation = tokenGeneration;
  try {
    if (!valid() || Date.now() < tokenRetryNotBefore) return null;
    const response = await request("/notifications/events/token", { method: "POST" }, { signal, expectedIdentity: owner.identity });
    if (generation !== tokenGeneration || !valid()) return null;
    if (!response.ok) {
      if (response.status === 429) tokenRetryNotBefore = Date.now() + retryAfterDelay(response);
      return null;
    }
    const { token } = await parseApiResponse(response, await tokenContract(), "/notifications/events/token");
    if (generation !== tokenGeneration || !valid()) return null;
    tokenRetryNotBefore = 0;
    return token;
  } catch {
    return null;
  } finally {
    if (generation === tokenGeneration && tokenFetch?.ownerKey === owner.key) tokenFetch = null;
  }
}

function fetchStreamToken(owner: StreamOwner, signal: AbortSignal, valid: () => boolean) {
  if (tokenFetch?.ownerKey === owner.key) return tokenFetch.promise;
  const promise = Promise.resolve().then(() => mintStreamToken(owner, signal, valid));
  tokenFetch = { ownerKey: owner.key, promise };
  return promise;
}

function openStream(owner: StreamOwner): ActiveStream {
  const controller = new AbortController();
  let retryCount = 0;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let stableTimer: ReturnType<typeof setTimeout> | undefined;
  let connecting = false;
  const toastIds = new Set<string | number>();
  const valid = () => !controller.signal.aborted && activeStream?.controller === controller && activeStream.subscribers > 0 && currentOwner(owner.key) !== undefined && !isImpersonating();
  const invalidate = () => {
    const selected = currentOwner(owner.key);
    if (valid() && selected) invalidateNotificationInbox(selected.queryClient);
  };
  const showIncoming = (notification: Notification) => {
    if (!valid()) return;
    const openLink = () => {
      const selected = currentOwner(owner.key);
      if (valid() && selected && notification.link) selected.router.push(normalizeBuildDeepLink(notification.link));
    };
    const id = toast(notification.title, {
      description: notification.message ?? undefined,
      ...(notification.link ? { action: { label: "View", onClick: openLink } } : {}),
    });
    if (typeof id === "string" || typeof id === "number") toastIds.add(id);
    if (toastIds.size > 1_000) {
      const oldest = toastIds.values().next().value;
      if (oldest !== undefined) { toast.dismiss(oldest); toastIds.delete(oldest); }
    }
  };
  const hydration = createNotificationToastHydration({ identity: owner.identity, signal: controller.signal, isCurrent: valid, onNotification: showIncoming, invalidate });

  const scheduleRetry = () => {
    if (controller.signal.aborted) return;
    if (retryTimer) clearTimeout(retryTimer);
    retryCount += 1;
    const delay = Math.min(MAX_BACKOFF_MS, 1_000 * 2 ** (Math.min(retryCount, 9) - 1)) + Math.floor(Math.random() * 500);
    retryTimer = setTimeout(() => { retryTimer = undefined; void connect(); }, Math.max(delay, tokenRetryNotBefore - Date.now()));
  };
  const connect = async () => {
    if (!valid() || connecting) return;
    connecting = true;
    try {
      const token = await fetchStreamToken(owner, controller.signal, valid);
      if (!valid()) return;
      if (!token) { scheduleRetry(); return; }
      await consumeNotificationStream(`${BACKEND_URL}/notifications/events`, token, controller.signal, ({ id }) => hydration.hint(id), {
        onOpen: () => {
          if (!valid()) return;
          hydration.reconnect();
          stableTimer = setTimeout(() => { retryCount = 0; }, STREAM_STABLE_MS);
        },
        onCountChanged: hydration.changed,
      });
      scheduleRetry();
    } catch {
      scheduleRetry();
    } finally {
      clearTimeout(stableTimer);
      connecting = false;
    }
  };
  const reconnectNow = () => {
    if (!valid()) return;
    hydration.reconnect();
    retryCount = 0;
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = undefined;
    void connect();
  };
  window.addEventListener("online", reconnectNow);
  void Promise.resolve().then(connect);
  return {
    ownerKey: owner.key, subscribers: 0, controller,
    resume() {
      hydration.wake();
      if (!connecting && retryTimer === undefined) void connect();
    },
    release() {
      hydration.stop();
      controller.abort();
      window.removeEventListener("online", reconnectNow);
      if (retryTimer) clearTimeout(retryTimer);
      clearTimeout(stableTimer);
      for (const id of toastIds) toast.dismiss(id);
      toastIds.clear();
    },
  };
}

function subscribeImpersonation(change: () => void) {
  window.addEventListener("impersonation-change", change);
  return () => window.removeEventListener("impersonation-change", change);
}

export function useNotificationEvents(): void {
  const queryClient = useQueryClient();
  const { data: session, status } = useSession();
  const router = useRouter();
  const scope = useOrgStorageScope();
  const impersonating = useSyncExternalStore(subscribeImpersonation, isImpersonating, () => false);
  const subscription = useRef(Symbol("notification-stream"));
  const identity = useMemo(() => expectedRequestIdentitySchema.safeParse({ userId: session?.user?.id, orgId: session?.orgId, sessionId: session?.sessionId }), [session?.user?.id, session?.orgId, session?.sessionId]);
  const ownerKey = status !== "unauthenticated" && identity.success && !impersonating && scope === authenticatedScope(identity.data.orgId, identity.data.userId)
    ? JSON.stringify([identity.data.orgId, identity.data.userId, identity.data.sessionId]) : null;

  useLayoutEffect(() => {
    const id = subscription.current;
    if (!ownerKey || !identity.success) { clearStreamToken(); return; }
    if (selectedOwnerKey !== ownerKey) { clearStreamToken(); clearBackendTokenCache(); selectedOwnerKey = ownerKey; }
    committedOwners.set(id, { key: ownerKey, identity: identity.data, queryClient, router });
    return () => { committedOwners.delete(id); };
  }, [ownerKey, identity, queryClient, router]);

  useEffect(() => {
    if (!ownerKey) return;
    const owner = currentOwner(ownerKey);
    if (!owner) return;
    const stream = activeStream ?? openStream(owner);
    if (stream.releaseTimer) { clearTimeout(stream.releaseTimer); stream.releaseTimer = undefined; }
    activeStream = stream;
    stream.subscribers += 1;
    stream.resume();
    return () => {
      stream.subscribers -= 1;
      if (stream.subscribers > 0 || activeStream !== stream) return;
      stream.releaseTimer = setTimeout(() => {
        if (stream.subscribers > 0 || activeStream !== stream) return;
        stream.release(); activeStream = null;
      }, STREAM_RELEASE_GRACE_MS);
    };
  }, [ownerKey]);
}
