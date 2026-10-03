"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useEffect, useLayoutEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { isApiError, lazyContract, parseApiResponse } from "@/lib/api-envelope";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import type {
  Notification,
  UnreadCount,
  NotificationListParams,
} from "@/types/notifications";
import {
  SHARED_UNREAD_PARAMS,
  toStringParams,
  useNotificationInboxInvalidation,
  type NotificationMutationOwner,
} from "./notifications-shared";
import { NOTIFICATION_FALLBACK_INTERVAL_MS } from "@/lib/query-request-policies";
import type { IdCursorPage } from "@/hooks/api/id-cursor-page-schema";
import {
  type NotificationAck,
  useNotificationRowPatch,
} from "./notifications-inbox-optimistic";
import { NO_ID_CURSOR_YET } from "@/hooks/api/cursor-page-param";

interface SelectedNotificationRead {
  id: number;
  section: "ALL" | "SNOOZED" | "ARCHIVED";
  owner: NotificationMutationOwner;
  notification: Notification | null;
  error: unknown;
  isMissing: boolean;
}

export function useInboxSelectedNotification(id: number | null, section: SelectedNotificationRead["section"]) {
  const { captureOwner, queryClient } = useNotificationInboxInvalidation();
  const [owner, setOwner] = useState<NotificationMutationOwner | null>(null);
  useLayoutEffect(() => {
    const next = captureOwner();
    if (next === owner) return;
    let live = true;
    queueMicrotask(() => { if (live && (!next || next.isCurrent())) setOwner(next); });
    return () => { live = false; };
  }, [captureOwner, owner]);
  const [revision, refresh] = useState(0);
  const [state, setState] = useState<SelectedNotificationRead | null>(null);
  function retry() { refresh((value) => value + 1); }
  useEffect(() => {
    if (id === null) return;
    if (!owner) return;
    const controller = new AbortController();
    function abort() { controller.abort(); }
    owner.signal.addEventListener("abort", abort);
    const pending: SelectedNotificationRead = { id, section, owner, notification: null, error: null, isMissing: false };
    void Promise.resolve().then(async () => {
      if (!owner.isCurrent() || controller.signal.aborted) return;
      setState((previous) => previous?.id === id && previous.section === section && previous.owner === owner
        ? { ...pending, notification: previous.notification } : pending);
      const path = "/notifications?" + new URLSearchParams(toStringParams({ section, sourceModule: "build", ids: String(id), limit: 1 }));
      const response = await apiClient.request(path, { method: "GET" }, { signal: controller.signal, expectedIdentity: owner.identity });
      return parseApiResponse<IdCursorPage<Notification>>(response, await notificationListLazy(), "/notifications");
    }).then((page) => {
      if (!page || !owner.isCurrent() || controller.signal.aborted) return;
      const row = page.data.length === 1 ? page.data[0] : undefined;
      const notification = row?.id === id && row.sourceModule === "build" && row.orgId === owner.identity.orgId
        && (row.userId === null || row.userId === owner.identity.userId) ? row : null;
      setState({ ...pending, notification, isMissing: notification === null });
    }).catch((error: unknown) => {
      if (!owner.isCurrent() || controller.signal.aborted) return;
      const isMissing = isApiError(error) && (error.status === 403 || error.status === 404);
      setState({ ...pending, error: isMissing ? null : error, isMissing });
    });
    return () => { owner.signal.removeEventListener("abort", abort); controller.abort(); };
  }, [id, section, owner, revision]);
  useEffect(() => {
    if (id === null) return;
    let live = true, scheduled = false;
    function wake() {
      if (scheduled) return;
      scheduled = true;
      queueMicrotask(() => { scheduled = false; if (live) refresh((value) => value + 1); });
    }
    const prefix = platformCoreQueryKeys.notifications.lists();
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === "updated" && event.action.type === "invalidate"
        && prefix.every((part, index) => event.query.queryKey[index] === part)) wake();
    });
    window.addEventListener("focus", wake); window.addEventListener("online", wake);
    const timer = setInterval(wake, NOTIFICATION_FALLBACK_INTERVAL_MS);
    return () => { live = false; unsubscribe(); window.removeEventListener("focus", wake); window.removeEventListener("online", wake); clearInterval(timer); };
  }, [id, queryClient]);
  const current = id !== null && state?.id === id && state.section === section && captureOwner() === state.owner && state.owner.isCurrent();
  return { notification: current ? state.notification : null, error: current ? state.error : null,
    isMissing: current && state.isMissing, isPending: id !== null && (!current || (!state.notification && !state.error && !state.isMissing)), retry };
}

const notificationListLazy = lazyContract(() =>
  import("@/hooks/api/notifications-schema").then(
    (m) => m.notificationListContract,
  ),
);
const notificationCountLazy = lazyContract(() =>
  import("@/hooks/api/notifications-schema").then(
    (m) => m.notificationCountContract,
  ),
);
const notificationAckLazy = lazyContract(() =>
  import("@/hooks/api/notifications-schema").then(
    (m) => m.notificationAckContract,
  ),
);

export {
  useArchiveNotification,
  useUnarchiveNotification,
  useDeleteNotification,
  usePinNotification,
  useUnpinNotification,
  useSnoozeNotification,
  useUnsnoozeNotification,
  useBulkArchive,
  useBulkDelete,
  useApproveNotification,
  useRejectNotification,
} from "./notifications-inbox-actions";

export const useNotifications = (
  params?: NotificationListParams,
  options?: Omit<
    UseQueryOptions<Notification[], Error>,
    "queryKey" | "queryFn"
  >,
) => {
  const { data: session } = useSession();
  const orgId = session?.orgId;
  const { enabled: enabledOption, ...restOptions } = options ?? {};
  return useQuery<Notification[], Error>({
    queryKey: platformCoreQueryKeys.notifications.list(params),
    queryFn: async ({ signal }) =>
      (
        await apiClient.get<IdCursorPage<Notification>>(
          "/notifications",
          params ? toStringParams(params) : undefined,
          signal,
          notificationListLazy,
        )
      ).data,
    staleTime: 30_000,
    ...restOptions,
    enabled: !!orgId && (enabledOption ?? true),
  });
};

/**
 * `/notifications` orders by `id DESC` and continues with `id < cursor`, so the
 * only safe continuation is the lowest id the page carried. Reading
 * `page[page.length - 1].id` assumes the rows arrive in sort order; a page that
 * disagrees skips every row between the last element and the true minimum.
 */
function lowestNotificationId(page: Notification[]): number | undefined {
  let lowest: number | undefined;
  for (const item of page) {
    if (lowest === undefined || item.id < lowest) lowest = item.id;
  }
  return lowest;
}

type InfiniteNotificationParams = Omit<NotificationListParams, "cursor"> & {
  initialCursor?: number | null;
};

export const useInfiniteNotifications = (
  params?: InfiniteNotificationParams,
  options?: { enabled?: boolean },
) => {
  const { data: session } = useSession();
  const orgId = session?.orgId;
  const { initialCursor = null, ...requestParams } = params ?? {};
  const limit = requestParams.limit ?? 30;

  // The page stays a bare `Notification[]` here on purpose: the optimistic cache
  // helpers in `notifications-inbox-cache.ts` patch `InfiniteData<Notification[]>`
  // pages in place. The envelope is unwrapped at this boundary, and the
  // continuation is still the lowest id the page carried — `nextCursor` from the
  // body would say the same thing.
  return useInfiniteQuery<Notification[], Error>({
    queryKey: platformCoreQueryKeys.notifications.list({
      ...requestParams,
      initialCursor,
      infinite: true,
    }),
    initialPageParam: initialCursor ?? NO_ID_CURSOR_YET,
    queryFn: async ({ pageParam, signal }) =>
      (
        await apiClient.get<IdCursorPage<Notification>>(
          "/notifications",
          toStringParams({
            ...requestParams,
            limit,
            cursor: pageParam,
          }),
          signal,
          notificationListLazy,
        )
      ).data,
    getNextPageParam: (lastPage) =>
      lastPage.length < limit ? undefined : lowestNotificationId(lastPage),
    staleTime: 30_000,
    enabled: !!orgId && (options?.enabled ?? true),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: NOTIFICATION_FALLBACK_INTERVAL_MS,
  });
};

export const useUnreadNotifications = (
  options?: Omit<
    UseQueryOptions<Notification[], Error>,
    "queryKey" | "queryFn"
  >,
) => {
  const { data: session } = useSession();
  const orgId = session?.orgId;
  const { enabled: enabledOption, ...restOptions } = options ?? {};

  return useQuery<Notification[], Error>({
    queryKey: platformCoreQueryKeys.notifications.unreadList(),
    queryFn: async ({ signal }) =>
      (
        await apiClient.get<IdCursorPage<Notification>>(
          "/notifications",
          toStringParams(SHARED_UNREAD_PARAMS),
          signal,
          notificationListLazy,
        )
      ).data,
    staleTime: 30_000,
    ...restOptions,
    enabled: !!orgId && (enabledOption ?? true),
  });
};

export const useUnreadNotificationCount = (
  options?: Omit<UseQueryOptions<UnreadCount, Error>, "queryKey" | "queryFn">,
) => {
  const { data: session } = useSession();
  const orgId = session?.orgId;
  return useQuery<UnreadCount, Error>({
    queryKey: platformCoreQueryKeys.notifications.unreadCount(),
    queryFn: ({ signal }) =>
      apiClient.get<UnreadCount>(
        "/notifications/unread-count",
        undefined,
        signal,
        notificationCountLazy,
      ),
    staleTime: NOTIFICATION_FALLBACK_INTERVAL_MS,
    refetchOnWindowFocus: false,
    ...options,
    enabled: !!orgId && (options?.enabled ?? true),
  });
};

export const useMarkNotificationRead = () => useNotificationRowPatch<number>({
  mutationKey: ["notifications", "mark-read"],
  request: (id, config) => apiClient.patch<NotificationAck>(
    "/notifications/" + id + "/read", undefined, config, notificationAckLazy,
  ),
  patch: (id) => ({ kind: "field", change: { field: "isRead", value: true }, matches: (row) => row.id === id }),
});

export const useMarkAllNotificationsRead = (sourceModule?: string) => useNotificationRowPatch<void>({
  mutationKey: ["notifications", "mark-all-read"],
  request: (_vars, config) => apiClient.patch<NotificationAck>(
    sourceModule === undefined ? "/notifications/read-all"
      : "/notifications/source/" + encodeURIComponent(sourceModule) + "/read-all",
    undefined, config, notificationAckLazy,
  ),
  patch: () => ({
    kind: "field", change: { field: "isRead", value: true },
    matches: (row) => sourceModule === undefined || row.sourceModule === sourceModule,
  }),
});

export const useBulkMarkRead = () => useNotificationRowPatch<number[]>({
  mutationKey: ["notifications", "bulk-mark-read"],
  request: (ids, config) => apiClient.post<NotificationAck>(
    "/notifications/bulk/read", { ids }, config, notificationAckLazy,
  ),
  patch: (ids) => ({
    kind: "field", change: { field: "isRead", value: true }, matches: (row) => ids.includes(row.id),
  }),
});
