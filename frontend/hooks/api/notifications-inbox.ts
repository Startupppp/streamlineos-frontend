"use client";

import {
  useInfiniteQuery,
  useQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import type { UseQueryOptions, QueryKey } from "@tanstack/react-query";
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

function isInfiniteData<T>(data: unknown): data is InfiniteData<T> {
  if (typeof data !== "object" || data === null) return false;
  return "pages" in data && "pageParams" in data;
}

function isNotificationList(data: unknown): data is Notification[] {
  return Array.isArray(data);
}

type NotifListSnapshot = [QueryKey, unknown];

type NotifMutationContext = {
  previousLists: NotifListSnapshot[];
  previousCount: UnreadCount | undefined;
};

function snapshotAndPatchLists(
  queryClient: ReturnType<typeof useQueryClient>,
  listKey: QueryKey,
  patcher: (n: Notification) => Notification,
): NotifListSnapshot[] {
  const snapshots = queryClient.getQueriesData<unknown>({ queryKey: listKey });
  for (const [key, data] of snapshots) {
    if (data === undefined) continue;
    if (isInfiniteData<Notification[]>(data)) {
      queryClient.setQueryData<InfiniteData<Notification[]>>(key, {
        ...data,
        pages: data.pages.map((page) => page.map(patcher)),
      });
    } else if (isNotificationList(data)) {
      queryClient.setQueryData<Notification[]>(key, data.map(patcher));
    }
  }
  return snapshots;
}

function restoreListSnapshots(
  queryClient: ReturnType<typeof useQueryClient>,
  snapshots: NotifListSnapshot[],
): void {
  for (const [key, data] of snapshots) {
    queryClient.setQueryData(key, data);
  }
}

function snapshotAndRemoveFromLists(
  queryClient: ReturnType<typeof useQueryClient>,
  listKey: QueryKey,
  id: number,
): NotifListSnapshot[] {
  const snapshots = queryClient.getQueriesData<unknown>({ queryKey: listKey });
  for (const [key, data] of snapshots) {
    if (data === undefined) continue;
    if (isInfiniteData<Notification[]>(data))
      queryClient.setQueryData<InfiniteData<Notification[]>>(key, {
        ...data,
        pages: data.pages.map((page) => page.filter((n) => n.id !== id)),
      });
    else if (isNotificationList(data))
      queryClient.setQueryData<Notification[]>(key, data.filter((n) => n.id !== id));
  }
  return snapshots;
}

function findInLists(
  queryClient: ReturnType<typeof useQueryClient>,
  listKey: QueryKey,
  predicate: (n: Notification) => boolean,
): Notification | undefined {
  const entries = queryClient.getQueriesData<unknown>({ queryKey: listKey });
  for (const [, data] of entries) {
    if (data === undefined) continue;
    if (isInfiniteData<Notification[]>(data)) {
      for (const page of data.pages) {
        const found = page.find(predicate);
        if (found) return found;
      }
    } else if (isNotificationList(data)) {
      const found = data.find(predicate);
      if (found) return found;
    }
  }
  return undefined;
}

export const useNotifications = (
  params?: NotificationListParams,
  options?: Omit<UseQueryOptions<Notification[], Error>, "queryKey" | "queryFn">,
) => {
  const { data: session } = useSession();
  const orgId = session?.orgId;
  const { enabled: enabledOption, ...restOptions } = options ?? {};
  return useQuery<Notification[], Error>({
    queryKey: queryKeys.notifications.list(params as Record<string, unknown>),
    queryFn: ({ signal }) =>
      apiClient.get<Notification[]>(
        "/notifications",
        params ? toStringParams(params as Record<string, unknown>) : undefined,
        signal,
      ),
    staleTime: 30_000,
    ...restOptions,
    enabled: !!orgId && (enabledOption ?? true),
  });
};

export const useInfiniteNotifications = (
  params?: Omit<NotificationListParams, "cursor">,
  options?: { enabled?: boolean },
) => {
  const { data: session } = useSession();
  const orgId = session?.orgId;
  const limit = params?.limit ?? 30;

  return useInfiniteQuery<Notification[], Error>({
    queryKey: queryKeys.notifications.list({
      ...(params as Record<string, unknown>),
      infinite: true,
    }),
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam, signal }) =>
      apiClient.get<Notification[]>(
        "/notifications",
        toStringParams({
          ...(params as Record<string, unknown>),
          limit,
          cursor: pageParam,
        }),
        signal,
      ),
    getNextPageParam: (lastPage) =>
      lastPage.length < limit ? undefined : lastPage[lastPage.length - 1]?.id,
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
    queryFn: ({ signal }) =>
      apiClient.get<Notification[]>(
        "/notifications",
        toStringParams(SHARED_UNREAD_PARAMS as Record<string, unknown>),
        signal,
      ),
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
  return useMutation<{ success: boolean }, Error, number, NotifMutationContext>({
    mutationKey: ["notifications", "mark-read"],
    mutationFn: (id) => apiClient.patch<{ success: boolean }>(`/notifications/${id}/read`),
    onMutate: async (id) => {
      const listKey = queryKeys.notifications.lists();
      const unreadKey = queryKeys.notifications.unreadCount();
      await queryClient.cancelQueries({ queryKey: listKey });
      await queryClient.cancelQueries({ queryKey: unreadKey });
      const previousCount = queryClient.getQueryData<UnreadCount>(unreadKey);
      const found = findInLists(queryClient, listKey, (n) => n.id === id);
      const wasUnread = found !== undefined && !found.isRead;
      const previousLists = snapshotAndPatchLists(
        queryClient,
        listKey,
        (n) => (n.id === id ? { ...n, isRead: true } : n),
      );
      if (wasUnread)
        queryClient.setQueryData<UnreadCount>(unreadKey, (old) =>
          old ? { count: Math.max(0, old.count - 1) } : old,
        );
      return { previousLists, previousCount };
    },
    onError: (_err, _id, context) => {
      if (!context) return;
      restoreListSnapshots(queryClient, context.previousLists);
      if (context.previousCount !== undefined)
        queryClient.setQueryData(queryKeys.notifications.unreadCount(), context.previousCount);
    },
    onSettled: () => invalidateInbox(),
  });
};

export const useMarkAllNotificationsRead = () => {
  const { invalidateInbox, queryClient } = useNotificationInboxInvalidation();
  return useMutation<{ success: boolean }, Error, void, NotifMutationContext>({
    mutationKey: ["notifications", "mark-all-read"],
    mutationFn: () => apiClient.patch<{ success: boolean }>("/notifications/read-all"),
    onMutate: async () => {
      const listKey = queryKeys.notifications.lists();
      const unreadKey = queryKeys.notifications.unreadCount();
      await queryClient.cancelQueries({ queryKey: listKey });
      await queryClient.cancelQueries({ queryKey: unreadKey });
      const previousCount = queryClient.getQueryData<UnreadCount>(unreadKey);
      const previousLists = snapshotAndPatchLists(
        queryClient,
        listKey,
        (n) => ({ ...n, isRead: true }),
      );
      queryClient.setQueryData<UnreadCount>(unreadKey, { count: 0 });
      return { previousLists, previousCount };
    },
    onError: (_err, _vars, context) => {
      if (!context) return;
      restoreListSnapshots(queryClient, context.previousLists);
      if (context.previousCount !== undefined)
        queryClient.setQueryData(queryKeys.notifications.unreadCount(), context.previousCount);
    },
    onSettled: () => invalidateInbox(),
  });
};

export const useArchiveNotification = () => {
  const { invalidateInbox, queryClient } = useNotificationInboxInvalidation();
  return useMutation<{ success: boolean }, Error, number, NotifMutationContext>({
    mutationKey: ["notifications", "archive"],
    mutationFn: (id) => apiClient.patch<{ success: boolean }>(`/notifications/${id}/archive`),
    onMutate: async (id) => {
      const listKey = queryKeys.notifications.lists();
      const unreadKey = queryKeys.notifications.unreadCount();
      await queryClient.cancelQueries({ queryKey: listKey });
      await queryClient.cancelQueries({ queryKey: unreadKey });
      const previousCount = queryClient.getQueryData<UnreadCount>(unreadKey);
      const found = findInLists(queryClient, listKey, (n) => n.id === id);
      const wasUnread = found !== undefined && !found.isRead;
      const previousLists = snapshotAndPatchLists(
        queryClient,
        listKey,
        (n) => (n.id === id ? { ...n, archivedAt: new Date().toISOString() } : n),
      );
      if (wasUnread)
        queryClient.setQueryData<UnreadCount>(unreadKey, (old) =>
          old ? { count: Math.max(0, old.count - 1) } : old,
        );
      return { previousLists, previousCount };
    },
    onError: (_err, _id, context) => {
      if (!context) return;
      restoreListSnapshots(queryClient, context.previousLists);
      if (context.previousCount !== undefined)
        queryClient.setQueryData(queryKeys.notifications.unreadCount(), context.previousCount);
    },
    onSettled: () => invalidateInbox(),
  });
};

export const useUnarchiveNotification = () => {
  const { invalidateInbox, queryClient } = useNotificationInboxInvalidation();
  return useMutation<{ success: boolean }, Error, number, NotifMutationContext>({
    mutationKey: ["notifications", "unarchive"],
    mutationFn: (id) => apiClient.patch<{ success: boolean }>(`/notifications/${id}/unarchive`),
    onMutate: async (id) => {
      const listKey = queryKeys.notifications.lists();
      await queryClient.cancelQueries({ queryKey: listKey });
      const previousLists = snapshotAndPatchLists(queryClient, listKey,
        (n) => (n.id === id ? { ...n, archivedAt: null } : n));
      return { previousLists, previousCount: undefined };
    },
    onError: (_err, _id, context) => {
      if (!context) return;
      restoreListSnapshots(queryClient, context.previousLists);
    },
    onSettled: () => invalidateInbox(),
  });
};

export const useDeleteNotification = () => {
  const { invalidateInbox, queryClient } = useNotificationInboxInvalidation();
  return useMutation<{ success: boolean }, Error, number, NotifMutationContext>({
    mutationKey: ["notifications", "delete"],
    mutationFn: (id) => apiClient.delete<{ success: boolean }>(`/notifications/${id}`),
    onMutate: async (id) => {
      const listKey = queryKeys.notifications.lists();
      const unreadKey = queryKeys.notifications.unreadCount();
      await queryClient.cancelQueries({ queryKey: listKey });
      await queryClient.cancelQueries({ queryKey: unreadKey });
      const previousCount = queryClient.getQueryData<UnreadCount>(unreadKey);
      const found = findInLists(queryClient, listKey, (n) => n.id === id);
      const wasUnread = found !== undefined && !found.isRead;
      const previousLists = snapshotAndRemoveFromLists(queryClient, listKey, id);
      if (wasUnread)
        queryClient.setQueryData<UnreadCount>(unreadKey, (old) =>
          old ? { count: Math.max(0, old.count - 1) } : old,
        );
      return { previousLists, previousCount };
    },
    onError: (_err, _id, context) => {
      if (!context) return;
      restoreListSnapshots(queryClient, context.previousLists);
      if (context.previousCount !== undefined)
        queryClient.setQueryData(queryKeys.notifications.unreadCount(), context.previousCount);
    },
    onSettled: () => invalidateInbox(),
  });
};

export const usePinNotification = () => {
  const { invalidateInbox, queryClient } = useNotificationInboxInvalidation();
  return useMutation<{ success: boolean }, Error, number, NotifMutationContext>({
    mutationKey: ["notifications", "pin"],
    mutationFn: (id) => apiClient.patch<{ success: boolean }>(`/notifications/${id}/pin`),
    onMutate: async (id) => {
      const listKey = queryKeys.notifications.lists();
      await queryClient.cancelQueries({ queryKey: listKey });
      const previousLists = snapshotAndPatchLists(queryClient, listKey,
        (n) => (n.id === id ? { ...n, pinned: true } : n));
      return { previousLists, previousCount: undefined };
    },
    onError: (_err, _id, context) => {
      if (!context) return;
      restoreListSnapshots(queryClient, context.previousLists);
    },
    onSettled: () => invalidateInbox(),
  });
};

export const useUnpinNotification = () => {
  const { invalidateInbox, queryClient } = useNotificationInboxInvalidation();
  return useMutation<{ success: boolean }, Error, number, NotifMutationContext>({
    mutationKey: ["notifications", "unpin"],
    mutationFn: (id) => apiClient.patch<{ success: boolean }>(`/notifications/${id}/unpin`),
    onMutate: async (id) => {
      const listKey = queryKeys.notifications.lists();
      await queryClient.cancelQueries({ queryKey: listKey });
      const previousLists = snapshotAndPatchLists(queryClient, listKey,
        (n) => (n.id === id ? { ...n, pinned: false } : n));
      return { previousLists, previousCount: undefined };
    },
    onError: (_err, _id, context) => {
      if (!context) return;
      restoreListSnapshots(queryClient, context.previousLists);
    },
    onSettled: () => invalidateInbox(),
  });
};

export const useSnoozeNotification = () => {
  const { invalidateInbox, queryClient } = useNotificationInboxInvalidation();
  return useMutation<{ success: boolean }, Error, { id: number; snoozedUntil: string }, NotifMutationContext>({
    mutationKey: ["notifications", "snooze"],
    mutationFn: ({ id, snoozedUntil }) =>
      apiClient.patch<{ success: boolean }>(`/notifications/${id}/snooze`, { snoozedUntil }),
    onMutate: async ({ id, snoozedUntil }) => {
      const listKey = queryKeys.notifications.lists();
      await queryClient.cancelQueries({ queryKey: listKey });
      const previousLists = snapshotAndPatchLists(queryClient, listKey,
        (n) => (n.id === id ? { ...n, snoozedUntil } : n));
      return { previousLists, previousCount: undefined };
    },
    onError: (_err, _vars, context) => {
      if (!context) return;
      restoreListSnapshots(queryClient, context.previousLists);
    },
    onSettled: () => invalidateInbox(),
  });
};

export const useBulkMarkRead = () => {
  const { invalidateInbox, queryClient } = useNotificationInboxInvalidation();
  return useMutation<{ success: boolean }, Error, number[], NotifMutationContext>({
    mutationKey: ["notifications", "bulk-mark-read"],
    mutationFn: (ids) =>
      apiClient.post<{ success: boolean }>("/notifications/bulk/read", { ids }),
    onMutate: async (ids) => {
      const idSet = new Set(ids);
      const listKey = queryKeys.notifications.lists();
      const unreadKey = queryKeys.notifications.unreadCount();
      await queryClient.cancelQueries({ queryKey: listKey });
      await queryClient.cancelQueries({ queryKey: unreadKey });
      const previousCount = queryClient.getQueryData<UnreadCount>(unreadKey);
      const unreadIds = new Set<number>();
      const entries = queryClient.getQueriesData<unknown>({ queryKey: listKey });
      for (const [, data] of entries) {
        if (data === undefined) continue;
        if (isInfiniteData<Notification[]>(data)) {
          for (const page of data.pages)
            for (const n of page)
              if (idSet.has(n.id) && !n.isRead) unreadIds.add(n.id);
        } else if (isNotificationList(data)) {
          for (const n of data)
            if (idSet.has(n.id) && !n.isRead) unreadIds.add(n.id);
        }
      }
      const previousLists = snapshotAndPatchLists(
        queryClient,
        listKey,
        (n) => (idSet.has(n.id) ? { ...n, isRead: true } : n),
      );
      if (unreadIds.size > 0)
        queryClient.setQueryData<UnreadCount>(unreadKey, (old) =>
          old ? { count: Math.max(0, old.count - unreadIds.size) } : old,
        );
      return { previousLists, previousCount };
    },
    onError: (_err, _ids, context) => {
      if (!context) return;
      restoreListSnapshots(queryClient, context.previousLists);
      if (context.previousCount !== undefined)
        queryClient.setQueryData(queryKeys.notifications.unreadCount(), context.previousCount);
    },
    onSettled: () => invalidateInbox(),
  });
};

export const useBulkArchive = () => {
  const { invalidateInbox } = useNotificationInboxInvalidation();
  return useMutation<{ success: boolean }, Error, number[]>({
    mutationKey: ["notifications", "bulk-archive"],
    mutationFn: (ids) =>
      apiClient.post<{ success: boolean }>("/notifications/bulk/archive", { ids }),
    onSettled: () => invalidateInbox(),
  });
};

export const useBulkDelete = () => {
  const { invalidateInbox } = useNotificationInboxInvalidation();
  return useMutation<{ success: boolean }, Error, number[]>({
    mutationKey: ["notifications", "bulk-delete"],
    mutationFn: (ids) =>
      apiClient.post<{ success: boolean }>("/notifications/bulk/delete", { ids }),
    onSettled: () => invalidateInbox(),
  });
};

export const useApproveNotification = () => {
  const { invalidateInbox } = useNotificationInboxInvalidation();
  return useMutation<{ success: boolean }, Error, number>({
    mutationKey: ["notifications", "approve"],
    mutationFn: (id) => apiClient.post<{ success: boolean }>(`/notifications/${id}/approve`),
    onSettled: () => invalidateInbox(),
  });
};

export const useRejectNotification = () => {
  const { invalidateInbox } = useNotificationInboxInvalidation();
  return useMutation<{ success: boolean }, Error, number>({
    mutationKey: ["notifications", "reject"],
    mutationFn: (id) => apiClient.post<{ success: boolean }>(`/notifications/${id}/reject`),
    onSettled: () => invalidateInbox(),
  });
};
