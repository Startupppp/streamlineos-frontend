"use client";

import { useInfiniteQuery, useQuery, useMutation } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
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
  snapshotAndRemoveFromLists,
  snapshotAndRemoveFromListsMulti,
  snapshotAndPatchUnified,
  snapshotAndRemoveFromUnified,
} from "./notifications-inbox-cache";
import {
  type NotifMutationContext,
  type NotificationAck,
  applyUnreadDelta,
  beginInboxPatch,
  countUnreadAmong,
  isUnreadNow,
  restoreInboxSnapshot,
  useNotificationRowPatch,
} from "./notifications-inbox-optimistic";

export const useNotifications = (
  params?: NotificationListParams,
  options?: Omit<UseQueryOptions<Notification[], Error>, "queryKey" | "queryFn">,
) => {
  const { data: session } = useSession();
  const orgId = session?.orgId;
  const { enabled: enabledOption, ...restOptions } = options ?? {};
  return useQuery<Notification[], Error>({
    queryKey: queryKeys.notifications.list(params as Record<string, unknown>),
    queryFn: async ({ signal }) =>
      (await apiClient.get<IdCursorPage<Notification>>(
        "/notifications",
        params ? toStringParams(params as Record<string, unknown>) : undefined,
        signal,
      )).data,
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

export const useInfiniteNotifications = (
  params?: Omit<NotificationListParams, "cursor">,
  options?: { enabled?: boolean },
) => {
  const { data: session } = useSession();
  const orgId = session?.orgId;
  const limit = params?.limit ?? 30;

  // The page stays a bare `Notification[]` here on purpose: the optimistic cache
  // helpers in `notifications-inbox-cache.ts` patch `InfiniteData<Notification[]>`
  // pages in place. The envelope is unwrapped at this boundary, and the
  // continuation is still the lowest id the page carried — `nextCursor` from the
  // body would say the same thing.
  return useInfiniteQuery<Notification[], Error>({
    queryKey: queryKeys.notifications.list({
      ...(params as Record<string, unknown>),
      infinite: true,
    }),
    initialPageParam: undefined as number | undefined,
    queryFn: async ({ pageParam, signal }) =>
      (await apiClient.get<IdCursorPage<Notification>>(
        "/notifications",
        toStringParams({
          ...(params as Record<string, unknown>),
          limit,
          cursor: pageParam,
        }),
        signal,
      )).data,
    getNextPageParam: (lastPage) =>
      lastPage.length < limit ? undefined : lowestNotificationId(lastPage),
    staleTime: 30_000,
    enabled: !!orgId && (options?.enabled ?? true),
  });
};

export const useUnreadNotifications = (
  options?: Omit<UseQueryOptions<Notification[], Error>, "queryKey" | "queryFn">,
) => {
  const { data: session } = useSession();
  const orgId = session?.orgId;
  const { enabled: enabledOption, ...restOptions } = options ?? {};

  return useQuery<Notification[], Error>({
    queryKey: queryKeys.notifications.unreadList(),
    queryFn: async ({ signal }) =>
      (await apiClient.get<IdCursorPage<Notification>>(
        "/notifications",
        toStringParams(SHARED_UNREAD_PARAMS as Record<string, unknown>),
        signal,
      )).data,
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
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: ({ signal }) =>
      apiClient.get<UnreadCount>("/notifications/unread-count", undefined, signal),
    staleTime: NOTIFICATION_FALLBACK_INTERVAL_MS,
    refetchInterval: NOTIFICATION_FALLBACK_INTERVAL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    ...options,
    enabled: !!orgId && (options?.enabled ?? true),
  });
};

export const useMarkNotificationRead = () => {
  const { invalidateInbox, queryClient } = useNotificationInboxInvalidation();
  return useMutation<NotificationAck, Error, number, NotifMutationContext>({
    mutationKey: ["notifications", "mark-read"],
    mutationFn: (id) => apiClient.patch<NotificationAck>(`/notifications/${id}/read`),
    onMutate: async (id) => {
      const { listKey, unreadKey, previousCount } = await beginInboxPatch(queryClient);
      const cleared = isUnreadNow(queryClient, listKey, id) ? 1 : 0;
      const previousLists = [
        ...snapshotAndPatchLists(queryClient, listKey, (n) =>
          n.id === id ? { ...n, isRead: true } : n,
        ),
        ...snapshotAndPatchUnified(queryClient, queryKeys.inbox.all, (item) =>
          item.id === id ? { ...item, isRead: true } : item,
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
    mutationFn: () => apiClient.patch<NotificationAck>("/notifications/read-all"),
    onMutate: async () => {
      const { listKey, unreadKey, previousCount } = await beginInboxPatch(queryClient);
      const previousLists = [
        ...snapshotAndPatchLists(queryClient, listKey, (n) => ({ ...n, isRead: true })),
        ...snapshotAndPatchUnified(queryClient, queryKeys.inbox.all, (item) => ({
          ...item,
          isRead: true,
        })),
      ];
      queryClient.setQueryData<UnreadCount>(unreadKey, { count: 0 });
      return { previousLists, previousCount };
    },
    onError: (_err, _vars, context) => restoreInboxSnapshot(queryClient, context),
    onSettled: () => invalidateInbox(),
  });
};

export const useArchiveNotification = () => {
  const { invalidateInbox, queryClient } = useNotificationInboxInvalidation();
  return useMutation<NotificationAck, Error, number, NotifMutationContext>({
    mutationKey: ["notifications", "archive"],
    mutationFn: (id) => apiClient.patch<NotificationAck>(`/notifications/${id}/archive`),
    onMutate: async (id) => {
      const { listKey, unreadKey, previousCount } = await beginInboxPatch(queryClient);
      const cleared = isUnreadNow(queryClient, listKey, id) ? 1 : 0;
      const previousLists = [
        ...snapshotAndPatchLists(queryClient, listKey, (n) =>
          n.id === id ? { ...n, archivedAt: new Date().toISOString() } : n,
        ),
        ...snapshotAndRemoveFromUnified(queryClient, queryKeys.inbox.all, new Set([id])),
      ];
      applyUnreadDelta(queryClient, unreadKey, cleared);
      return { previousLists, previousCount };
    },
    onError: (_err, _id, context) => restoreInboxSnapshot(queryClient, context),
    onSettled: () => invalidateInbox(),
  });
};

export const useDeleteNotification = () => {
  const { invalidateInbox, queryClient } = useNotificationInboxInvalidation();
  return useMutation<NotificationAck, Error, number, NotifMutationContext>({
    mutationKey: ["notifications", "delete"],
    mutationFn: (id) => apiClient.delete<NotificationAck>(`/notifications/${id}`),
    onMutate: async (id) => {
      const { listKey, unreadKey, previousCount } = await beginInboxPatch(queryClient);
      const cleared = isUnreadNow(queryClient, listKey, id) ? 1 : 0;
      const previousLists = snapshotAndRemoveFromLists(queryClient, listKey, id);
      applyUnreadDelta(queryClient, unreadKey, cleared);
      return { previousLists, previousCount };
    },
    onError: (_err, _id, context) => restoreInboxSnapshot(queryClient, context),
    onSettled: () => invalidateInbox(),
  });
};

export const useUnarchiveNotification = () =>
  useNotificationRowPatch<number>({
    mutationKey: ["notifications", "unarchive"],
    request: (id) => apiClient.patch<NotificationAck>(`/notifications/${id}/unarchive`),
    patch: (id) => (n) => (n.id === id ? { ...n, archivedAt: null } : n),
  });

export const usePinNotification = () =>
  useNotificationRowPatch<number>({
    mutationKey: ["notifications", "pin"],
    request: (id) => apiClient.patch<NotificationAck>(`/notifications/${id}/pin`),
    patch: (id) => (n) => (n.id === id ? { ...n, pinned: true } : n),
  });

export const useUnpinNotification = () =>
  useNotificationRowPatch<number>({
    mutationKey: ["notifications", "unpin"],
    request: (id) => apiClient.patch<NotificationAck>(`/notifications/${id}/unpin`),
    patch: (id) => (n) => (n.id === id ? { ...n, pinned: false } : n),
  });

export const useSnoozeNotification = () =>
  useNotificationRowPatch<{ id: number; snoozedUntil: string }>({
    mutationKey: ["notifications", "snooze"],
    request: ({ id, snoozedUntil }) =>
      apiClient.patch<NotificationAck>(`/notifications/${id}/snooze`, { snoozedUntil }),
    patch:
      ({ id, snoozedUntil }) =>
      (n) =>
        n.id === id ? { ...n, snoozedUntil } : n,
  });

export const useBulkMarkRead = () => {
  const { invalidateInbox, queryClient } = useNotificationInboxInvalidation();
  return useMutation<NotificationAck, Error, number[], NotifMutationContext>({
    mutationKey: ["notifications", "bulk-mark-read"],
    mutationFn: (ids) =>
      apiClient.post<NotificationAck>("/notifications/bulk/read", { ids }),
    onMutate: async (ids) => {
      const idSet = new Set(ids);
      const { listKey, unreadKey, previousCount } = await beginInboxPatch(queryClient);
      const cleared = countUnreadAmong(queryClient, listKey, idSet);
      const previousLists = [
        ...snapshotAndPatchLists(queryClient, listKey, (n) =>
          idSet.has(n.id) ? { ...n, isRead: true } : n,
        ),
        ...snapshotAndPatchUnified(queryClient, queryKeys.inbox.all, (item) =>
          idSet.has(item.id) ? { ...item, isRead: true } : item,
        ),
      ];
      applyUnreadDelta(queryClient, unreadKey, cleared);
      return { previousLists, previousCount };
    },
    onError: (_err, _ids, context) => restoreInboxSnapshot(queryClient, context),
    onSettled: () => invalidateInbox(),
  });
};

export const useBulkArchive = () => {
  const { invalidateInbox, queryClient } = useNotificationInboxInvalidation();
  return useMutation<NotificationAck, Error, number[], NotifMutationContext>({
    mutationKey: ["notifications", "bulk-archive"],
    mutationFn: (ids) =>
      apiClient.post<NotificationAck>("/notifications/bulk/archive", { ids }),
    onMutate: async (ids) => {
      const idSet = new Set(ids);
      const { listKey, unreadKey, previousCount } = await beginInboxPatch(queryClient);
      const cleared = countUnreadAmong(queryClient, listKey, idSet);
      const archivedAt = new Date().toISOString();
      const previousLists = [
        ...snapshotAndPatchLists(queryClient, listKey, (n) =>
          idSet.has(n.id) ? { ...n, archivedAt } : n,
        ),
        ...snapshotAndRemoveFromUnified(queryClient, queryKeys.inbox.all, idSet),
      ];
      applyUnreadDelta(queryClient, unreadKey, cleared);
      return { previousLists, previousCount };
    },
    onError: (_err, _ids, context) => restoreInboxSnapshot(queryClient, context),
    onSettled: () => invalidateInbox(),
  });
};

export const useBulkDelete = () => {
  const { invalidateInbox, queryClient } = useNotificationInboxInvalidation();
  return useMutation<NotificationAck, Error, number[], NotifMutationContext>({
    mutationKey: ["notifications", "bulk-delete"],
    mutationFn: (ids) =>
      apiClient.post<NotificationAck>("/notifications/bulk/delete", { ids }),
    onMutate: async (ids) => {
      const idSet = new Set(ids);
      const { listKey, unreadKey, previousCount } = await beginInboxPatch(queryClient);
      const cleared = countUnreadAmong(queryClient, listKey, idSet);
      const previousLists = snapshotAndRemoveFromListsMulti(queryClient, listKey, idSet);
      applyUnreadDelta(queryClient, unreadKey, cleared);
      return { previousLists, previousCount };
    },
    onError: (_err, _ids, context) => restoreInboxSnapshot(queryClient, context),
    onSettled: () => invalidateInbox(),
  });
};

export const useApproveNotification = () => {
  const { invalidateInbox } = useNotificationInboxInvalidation();
  return useMutation<NotificationAck, Error, number>({
    mutationKey: ["notifications", "approve"],
    mutationFn: (id) => apiClient.post<NotificationAck>(`/notifications/${id}/approve`),
    onSettled: () => invalidateInbox(),
  });
};

export const useRejectNotification = () => {
  const { invalidateInbox } = useNotificationInboxInvalidation();
  return useMutation<NotificationAck, Error, number>({
    mutationKey: ["notifications", "reject"],
    mutationFn: (id) => apiClient.post<NotificationAck>(`/notifications/${id}/reject`),
    onSettled: () => invalidateInbox(),
  });
};
