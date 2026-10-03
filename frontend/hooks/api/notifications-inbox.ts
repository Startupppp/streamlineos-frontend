"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import type {
  Notification,
  UnreadCount,
  NotificationListParams,
} from "@/types/notifications";
import {
  SHARED_UNREAD_PARAMS,
  toStringParams,
} from "./notifications-shared";
import { NOTIFICATION_FALLBACK_INTERVAL_MS } from "@/lib/query-request-policies";
import type { IdCursorPage } from "@/hooks/api/id-cursor-page-schema";
import {
  type NotificationAck,
  useNotificationRowPatch,
} from "./notifications-inbox-optimistic";
import { NO_ID_CURSOR_YET } from "@/hooks/api/cursor-page-param";

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




