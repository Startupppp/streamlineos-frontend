"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useId, useLayoutEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { ApiError, isApiError, lazyContract, parseApiResponse } from "@/lib/api-envelope";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
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
  notification: Notification | null;
  isMissing: boolean;
  ownerStamp: string;
}
type SelectedNotificationSection = "ALL" | "SNOOZED" | "ARCHIVED";
type SelectedReadOwner = { id: number | null; section: SelectedNotificationSection; owner: NotificationMutationOwner; ownerStamp: string };
type SelectedReadFailure = { ownerStamp: string; error: unknown };

export function useInboxSelectedNotification(id: number | null, section: SelectedNotificationSection) {
  const { captureOwner, queryClient } = useNotificationInboxInvalidation();
  const instanceId = useId();
  const sequence = useRef(0);
  const [lease, setLease] = useState<SelectedReadOwner | null>(null);
  useLayoutEffect(() => {
    const next = captureOwner();
    if (next === lease?.owner && id === lease.id && section === lease.section) return;
    let live = true;
    const queryKey = platformCoreQueryKeys.notifications.selected(id, section);
    const cancellations = [queryClient.cancelQueries({ queryKey, exact: true })];
    if (lease && (lease.id !== id || lease.section !== section)) cancellations.push(queryClient.cancelQueries({
      queryKey: platformCoreQueryKeys.notifications.selected(lease.id, lease.section), exact: true,
    }));
    void Promise.all(cancellations).then(() => {
      if (!live) return;
      setLease(next?.isCurrent() ? { id, section, owner: next, ownerStamp: instanceId + ":" + ++sequence.current } : null);
    });
    return () => { live = false; };
  }, [captureOwner, lease, id, section, queryClient, instanceId]);
  const active = id !== null && lease?.id === id && lease.section === section && captureOwner() === lease.owner && lease.owner.isCurrent();
  const query = useQuery<SelectedNotificationRead, SelectedReadFailure>({
    queryKey: platformCoreQueryKeys.notifications.selected(id, section),
    queryFn: async ({ signal }) => {
      if (!lease || id === null) throw { ownerStamp: "", error: new ApiError("Your signed-in account changed.", undefined, "REQUEST_IDENTITY_CHANGED") };
      const controller = new AbortController();
      function abort() { controller.abort(); }
      signal.addEventListener("abort", abort);
      lease.owner.signal.addEventListener("abort", abort);
      if (signal.aborted || lease.owner.signal.aborted) abort();
      function requireCurrent() {
        if (controller.signal.aborted || !lease?.owner.isCurrent()) throw new ApiError("Your signed-in account changed.", undefined, "REQUEST_IDENTITY_CHANGED");
      }
      try {
        requireCurrent();
        const search = new URLSearchParams(toStringParams({ section, sourceModule: "build", ids: String(id), limit: 1 }));
        const response = await apiClient.request(`/notifications?${search}`, { method: "GET" }, { signal: controller.signal, expectedIdentity: lease.owner.identity });
        requireCurrent();
        const page = await parseApiResponse<IdCursorPage<Notification>>(response, await notificationListLazy(), "/notifications");
        requireCurrent();
        const row = page.data.length === 1 ? page.data[0] : undefined;
        const notification = row?.id === id && row.sourceModule === "build" && row.orgId === lease.owner.identity.orgId
          && (row.userId === null || row.userId === lease.owner.identity.userId) ? row : null;
        return { ownerStamp: lease.ownerStamp, notification, isMissing: notification === null };
      } catch (error: unknown) {
        requireCurrent();
        if (isApiError(error) && (error.status === 403 || error.status === 404))
          return { ownerStamp: lease.ownerStamp, notification: null, isMissing: true };
        throw { ownerStamp: lease.ownerStamp, error };
      } finally {
        signal.removeEventListener("abort", abort);
        lease.owner.signal.removeEventListener("abort", abort);
      }
    },
    enabled: active, staleTime: 0, retry: false, refetchOnMount: "always", refetchOnWindowFocus: true,
    refetchOnReconnect: true, refetchInterval: NOTIFICATION_FALLBACK_INTERVAL_MS, ...INLINE_READ_ERROR,
  });
  const receipt = active && query.data?.ownerStamp === lease.ownerStamp ? query.data : null;
  const error = active && query.error?.ownerStamp === lease.ownerStamp ? query.error.error : null;
  function retry() { if (active) void query.refetch(); }
  return { notification: error ? null : receipt?.notification ?? null, error,
    isMissing: !error && !!receipt?.isMissing, isPending: id !== null && (!active || (!receipt && !error)), retry };
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
    `/notifications/${id}/read`, undefined, config, notificationAckLazy,
  ),
  patch: (id) => ({ kind: "field", change: { field: "isRead", value: true }, matches: (row) => row.id === id }),
});

export const useMarkAllNotificationsRead = (sourceModule?: string) => useNotificationRowPatch<void>({
  mutationKey: ["notifications", "mark-all-read"],
  request: (_vars, config) => sourceModule === undefined
    ? apiClient.patch<NotificationAck>("/notifications/read-all", undefined, config, notificationAckLazy)
    : apiClient.patch<NotificationAck>(`/notifications/source/${encodeURIComponent(sourceModule)}/read-all`, undefined, config, notificationAckLazy),
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
