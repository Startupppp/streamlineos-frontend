"use client";

import { useInfiniteQuery, useQuery, useMutation } from "@tanstack/react-query";
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
  useNotificationInboxInvalidation,
} from "./notifications-shared";
import { NOTIFICATION_FALLBACK_INTERVAL_MS } from "@/lib/query-request-policies";
import type { IdCursorPage } from "@/hooks/api/id-cursor-page-schema";
import {
  snapshotAndPatchLists,
  snapshotAndPatchUnified,
} from "./notifications-inbox-cache";
import {
  type NotifMutationContext,
  type NotificationAck,
  applyUnreadDelta,
  beginInboxPatch,
  countUnreadAmong,
  isUnreadNow,
  restoreInboxSnapshot,
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

export const useMarkNotificationRead = () => {
  const { invalidateInbox, queryClient } = useNotificationInboxInvalidation();
  return useMutation<NotificationAck, Error, number, NotifMutationContext>({
    mutationKey: ["notifications", "mark-read"],
    mutationFn: (notificationId) =>
      apiClient.patch<NotificationAck>(
        `/notifications/${notificationId}/read`,
        undefined,
        undefined,
        notificationAckLazy,
      ),
    onMutate: async (notificationId) => {
      const { listKey, unreadKey, previousCount } =
        await beginInboxPatch(queryClient);
      const cleared = isUnreadNow(queryClient, listKey, notificationId) ? 1 : 0;
      const previousLists = [
        ...snapshotAndPatchLists(queryClient, listKey, (n) =>
          n.id === notificationId ? { ...n, isRead: true } : n,
        ),
        ...snapshotAndPatchUnified(
          queryClient,
          platformCoreQueryKeys.inbox.all,
          (item) => (item.id === notificationId ? { ...item, isRead: true } : item),
        ),
      ];
      applyUnreadDelta(queryClient, unreadKey, cleared);
      return { previousLists, previousCount };
    },
    onError: (_err, _id, context) => restoreInboxSnapshot(queryClient, context),
    onSettled: () => invalidateInbox(),
  });
};

export const useMarkAllNotificationsRead = () => {
  const { invalidateInbox, queryClient } = useNotificationInboxInvalidation();
  return useMutation<NotificationAck, Error, void, NotifMutationContext>({
    mutationKey: ["notifications", "mark-all-read"],
    mutationFn: () =>
      apiClient.patch<NotificationAck>(
        "/notifications/read-all",
        undefined,
        undefined,
        notificationAckLazy,
      ),
    onMutate: async () => {
      const { listKey, unreadKey, previousCount } =
        await beginInboxPatch(queryClient);
      const previousLists = [
        ...snapshotAndPatchLists(queryClient, listKey, (n) => ({
          ...n,
          isRead: true,
        })),
        ...snapshotAndPatchUnified(
          queryClient,
          platformCoreQueryKeys.inbox.all,
          (item) => ({
            ...item,
            isRead: true,
          }),
        ),
      ];
      queryClient.setQueryData<UnreadCount>(unreadKey, { count: 0 });
      return { previousLists, previousCount };
    },
    onError: (_err, _vars, context) =>
      restoreInboxSnapshot(queryClient, context),
    onSettled: () => invalidateInbox(),
  });
};







export const useBulkMarkRead = () => {
  const { invalidateInbox, queryClient } = useNotificationInboxInvalidation();
  return useMutation<NotificationAck, Error, number[], NotifMutationContext>({
    mutationKey: ["notifications", "bulk-mark-read"],
    mutationFn: (ids) =>
      apiClient.post<NotificationAck>(
        "/notifications/bulk/read",
        { ids },
        undefined,
        notificationAckLazy,
      ),
    onMutate: async (ids) => {
      const idSet = new Set(ids);
      const { listKey, unreadKey, previousCount } =
        await beginInboxPatch(queryClient);
      const cleared = countUnreadAmong(queryClient, listKey, idSet);
      const previousLists = [
        ...snapshotAndPatchLists(queryClient, listKey, (n) =>
          idSet.has(n.id) ? { ...n, isRead: true } : n,
        ),
        ...snapshotAndPatchUnified(
          queryClient,
          platformCoreQueryKeys.inbox.all,
          (item) => (idSet.has(item.id) ? { ...item, isRead: true } : item),
        ),
      ];
      applyUnreadDelta(queryClient, unreadKey, cleared);
      return { previousLists, previousCount };
    },
    onError: (_err, _ids, context) =>
      restoreInboxSnapshot(queryClient, context),
    onSettled: () => invalidateInbox(),
  });
};




