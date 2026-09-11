"use client";

import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions, QueryKey } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  Notification,
  UnreadCount,
  NotificationListParams,
} from "@/types/notifications";
import { SHARED_UNREAD_PARAMS, toStringParams, useNotificationInboxInvalidation } from "./notifications-shared";
import { NOTIFICATION_FALLBACK_INTERVAL_MS } from "@/lib/query-request-policies";

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
  options?: Omit<UseQueryOptions<Notification[], Error>, "queryKey" | "queryFn">,
) => {
  const { data: session } = useSession();
  const orgId = session?.orgId;
  const { enabled: enabledOption, ...restOptions } = options ?? {};
  return useQuery<Notification[], Error>({
    queryKey: queryKeys.notifications.list(params as Record<string, unknown>),
    queryFn: () =>
      apiClient.get<Notification[]>(
        "/notifications",
        params ? toStringParams(params as Record<string, unknown>) : undefined,
      ),
    staleTime: 30_000,
    ...restOptions,
    enabled: !!orgId && (enabledOption ?? true),
  });
};

/**
 * RT-008. The feed fetched a flat `limit: 50` and ignored the `cursor` the backend has
 * always supported, so it silently truncated at 50 with no way to see anything older.
 *
 * Keyset, not offset: the list endpoint filters `id < cursor`, so the next cursor is
 * simply the last id on the page. A full page means there may be more; a short page is
 * the end. Offset pagination would re-scan everything already seen.
 */
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
    queryFn: ({ pageParam }) =>
      apiClient.get<Notification[]>(
        "/notifications",
        toStringParams({ ...(params as Record<string, unknown>), limit, cursor: pageParam }),
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
    queryFn: () =>
      apiClient.get<Notification[]>(
        "/notifications",
        toStringParams(SHARED_UNREAD_PARAMS as Record<string, unknown>),
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
    queryFn: () => apiClient.get<UnreadCount>("/notifications/unread-count"),
    staleTime: NOTIFICATION_FALLBACK_INTERVAL_MS,
    refetchInterval: NOTIFICATION_FALLBACK_INTERVAL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    ...options,
    enabled: !!orgId && (options?.enabled ?? true),
  });
};

export const useMarkNotificationRead = () => {
  const { invalidateInbox, orgId, queryClient } = useNotificationInboxInvalidation();
  return useMutation<
    { success: boolean },
    Error,
    number,
    { previousLists: [QueryKey, Notification[] | undefined][]; previousCount: UnreadCount | undefined }
  >({
    mutationKey: ["notifications", "mark-read"],
    mutationFn: (id) => apiClient.patch<{ success: boolean }>(`/notifications/${id}/read`),
    onMutate: async (id) => {
      const listKey = queryKeys.notifications.lists();
      const unreadKey = queryKeys.notifications.unreadCount();
      await queryClient.cancelQueries({ queryKey: listKey });
      await queryClient.cancelQueries({ queryKey: unreadKey });
      const previousLists = queryClient.getQueriesData<Notification[]>({ queryKey: listKey });
      const previousCount = queryClient.getQueryData<UnreadCount>(unreadKey);
      let wasUnread = false;
      for (const [, data] of previousLists) {
        const found = data?.find((n) => n.id === id);
        if (found) {
          wasUnread = !found.isRead;
          break;
        }
      }
      queryClient.setQueriesData<Notification[]>({ queryKey: listKey }, (old) =>
        old ? old.map((n) => (n.id === id ? { ...n, isRead: true } : n)) : old,
      );
      if (wasUnread) {
        queryClient.setQueryData<UnreadCount>(unreadKey, (old) =>
          old ? { count: Math.max(0, old.count - 1) } : old,
        );
      }
      return { previousLists, previousCount };
    },
    onError: (_err, _id, context) => {
      if (context) {
        context.previousLists.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
        if (context.previousCount !== undefined) {
          queryClient.setQueryData(queryKeys.notifications.unreadCount(), context.previousCount);
        }
      }
    },
    onSettled: () => invalidateInbox(),
  });
};

export const useMarkAllNotificationsRead = () => {
  const { invalidateInbox, orgId, queryClient } =
    useNotificationInboxInvalidation();
  return useMutation<
    { success: boolean },
    Error,
    void,
    { previousLists: [QueryKey, Notification[] | undefined][]; previousCount: UnreadCount | undefined }
  >({
    mutationKey: ["notifications", "mark-all-read"],
    mutationFn: () => apiClient.patch<{ success: boolean }>("/notifications/read-all"),
    onMutate: async () => {
      const listKey = queryKeys.notifications.lists();
      const unreadKey = queryKeys.notifications.unreadCount();
      await queryClient.cancelQueries({ queryKey: listKey });
      await queryClient.cancelQueries({ queryKey: unreadKey });
      const previousLists = queryClient.getQueriesData<Notification[]>({ queryKey: listKey });
      const previousCount = queryClient.getQueryData<UnreadCount>(unreadKey);
      queryClient.setQueriesData<Notification[]>({ queryKey: listKey }, (old) =>
        old ? old.map((n) => ({ ...n, isRead: true })) : old,
      );
      queryClient.setQueryData<UnreadCount>(unreadKey, { count: 0 });
      return { previousLists, previousCount };
    },
    onError: (_, _vars, context) => {
      if (context) {
        context.previousLists.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
        if (context.previousCount !== undefined) {
          queryClient.setQueryData(
            queryKeys.notifications.unreadCount(),
            context.previousCount,
          );
        }
      }
    },
    onSettled: () => {
      invalidateInbox();
    },
  });
};

export const useBulkMarkRead = () => {
  const { invalidateInbox, orgId, queryClient } = useNotificationInboxInvalidation();
  return useMutation<
    { success: boolean },
    Error,
    number[],
    { previousLists: [QueryKey, Notification[] | undefined][]; previousCount: UnreadCount | undefined }
  >({
    mutationKey: ["notifications", "bulk-mark-read"],
    mutationFn: (ids) => apiClient.post<{ success: boolean }>("/notifications/bulk/read", { ids }),
    onMutate: async (ids) => {
      const idSet = new Set(ids);
      const listKey = queryKeys.notifications.lists();
      const unreadKey = queryKeys.notifications.unreadCount();
      await queryClient.cancelQueries({ queryKey: listKey });
      await queryClient.cancelQueries({ queryKey: unreadKey });
      const previousLists = queryClient.getQueriesData<Notification[]>({ queryKey: listKey });
      const previousCount = queryClient.getQueryData<UnreadCount>(unreadKey);
      const unreadIds = new Set<number>();
      for (const [, data] of previousLists) {
        if (data) {
          for (const n of data) {
            if (idSet.has(n.id) && !n.isRead) unreadIds.add(n.id);
          }
        }
      }
      queryClient.setQueriesData<Notification[]>({ queryKey: listKey }, (old) =>
        old ? old.map((n) => (idSet.has(n.id) ? { ...n, isRead: true } : n)) : old,
      );
      if (unreadIds.size > 0) {
        queryClient.setQueryData<UnreadCount>(unreadKey, (old) =>
          old ? { count: Math.max(0, old.count - unreadIds.size) } : old,
        );
      }
      return { previousLists, previousCount };
    },
    onError: (_err, _ids, context) => {
      if (context) {
        context.previousLists.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
        if (context.previousCount !== undefined) {
          queryClient.setQueryData(queryKeys.notifications.unreadCount(), context.previousCount);
        }
      }
    },
    onSettled: () => invalidateInbox(),
  });
};
