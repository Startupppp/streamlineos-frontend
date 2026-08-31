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
  NotificationPreferences,
  UpdatePreferencesInput,
  SuppressionRule,
  CreateSuppressionInput,
} from "@/types/notifications";
import { SHARED_UNREAD_PARAMS, toStringParams, useNotificationInboxInvalidation } from "./notifications-shared";
import { NOTIFICATION_FALLBACK_INTERVAL_MS } from "@/lib/query-request-policies";

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

export const useArchiveNotification = () => {
  const { invalidateInbox } = useNotificationInboxInvalidation();
  return useMutation<{ success: boolean }, Error, number>({
    mutationKey: ["notifications", "archive"],
    mutationFn: (id) => apiClient.patch<{ success: boolean }>(`/notifications/${id}/archive`),
    onSuccess: invalidateInbox,
  });
};

export const useUnarchiveNotification = () => {
  const { invalidateInbox } = useNotificationInboxInvalidation();
  return useMutation<{ success: boolean }, Error, number>({
    mutationKey: ["notifications", "unarchive"],
    mutationFn: (id) => apiClient.patch<{ success: boolean }>(`/notifications/${id}/unarchive`),
    onSuccess: invalidateInbox,
  });
};

export const useDeleteNotification = () => {
  const { invalidateInbox } = useNotificationInboxInvalidation();
  return useMutation<{ success: boolean }, Error, number>({
    mutationKey: ["notifications", "delete"],
    mutationFn: (id) => apiClient.delete<{ success: boolean }>(`/notifications/${id}`),
    onSuccess: invalidateInbox,
  });
};

export const usePinNotification = () => {
  const { invalidateInbox } = useNotificationInboxInvalidation();
  return useMutation<{ success: boolean }, Error, number>({
    mutationKey: ["notifications", "pin"],
    mutationFn: (id) => apiClient.patch<{ success: boolean }>(`/notifications/${id}/pin`),
    onSuccess: invalidateInbox,
  });
};

export const useUnpinNotification = () => {
  const { invalidateInbox } = useNotificationInboxInvalidation();
  return useMutation<{ success: boolean }, Error, number>({
    mutationKey: ["notifications", "unpin"],
    mutationFn: (id) => apiClient.patch<{ success: boolean }>(`/notifications/${id}/unpin`),
    onSuccess: invalidateInbox,
  });
};

export const useSnoozeNotification = () => {
  const { invalidateInbox } = useNotificationInboxInvalidation();
  return useMutation<{ success: boolean }, Error, { id: number; snoozedUntil: string }>({
    mutationKey: ["notifications", "snooze"],
    mutationFn: ({ id, snoozedUntil }) =>
      apiClient.patch<{ success: boolean }>(`/notifications/${id}/snooze`, { snoozedUntil }),
    onSuccess: invalidateInbox,
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

export const useBulkArchive = () => {
  const { invalidateInbox } = useNotificationInboxInvalidation();
  return useMutation<{ success: boolean }, Error, number[]>({
    mutationKey: ["notifications", "bulk-archive"],
    mutationFn: (ids) => apiClient.post<{ success: boolean }>("/notifications/bulk/archive", { ids }),
    onSuccess: invalidateInbox,
  });
};

export const useBulkDelete = () => {
  const { invalidateInbox } = useNotificationInboxInvalidation();
  return useMutation<{ success: boolean }, Error, number[]>({
    mutationKey: ["notifications", "bulk-delete"],
    mutationFn: (ids) => apiClient.post<{ success: boolean }>("/notifications/bulk/delete", { ids }),
    onSuccess: invalidateInbox,
  });
};

export const useApproveNotification = () => {
  const { invalidateInbox } = useNotificationInboxInvalidation();
  return useMutation<{ success: boolean }, Error, number>({
    mutationKey: ["notifications", "approve"],
    mutationFn: (id) => apiClient.post<{ success: boolean }>(`/notifications/${id}/approve`),
    onSuccess: invalidateInbox,
  });
};

export const useRejectNotification = () => {
  const { invalidateInbox } = useNotificationInboxInvalidation();
  return useMutation<{ success: boolean }, Error, number>({
    mutationKey: ["notifications", "reject"],
    mutationFn: (id) => apiClient.post<{ success: boolean }>(`/notifications/${id}/reject`),
    onSuccess: invalidateInbox,
  });
};

export const useNotificationPreferences = (
  options?: Omit<UseQueryOptions<NotificationPreferences, Error>, "queryKey" | "queryFn">,
) => {
  const { data: session } = useSession();
  const orgId = session?.orgId;
  const { enabled: enabledOption, ...restOptions } = options ?? {};
  return useQuery<NotificationPreferences, Error>({
    queryKey: queryKeys.notifications.preferences(),
    queryFn: () => apiClient.get<NotificationPreferences>("/notification-preferences"),
    staleTime: 5 * 60_000,
    ...restOptions,
    enabled: !!orgId && (enabledOption ?? true),
  });
};

export const useUpdateNotificationPreferences = () => {
  const queryClient = useQueryClient();
  return useMutation<NotificationPreferences, Error, UpdatePreferencesInput>({
    mutationKey: ["notifications", "preferences", "update"],
    mutationFn: (dto) => apiClient.patch<NotificationPreferences>("/notification-preferences", dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.preferences() });
    },
  });
};

export const useSuppressions = (
  options?: Omit<UseQueryOptions<SuppressionRule[], Error>, "queryKey" | "queryFn">,
) => {
  const { data: session } = useSession();
  const orgId = session?.orgId;
  const { enabled: enabledOption, ...restOptions } = options ?? {};
  return useQuery<SuppressionRule[], Error>({
    queryKey: queryKeys.notifications.suppressions(),
    queryFn: () => apiClient.get<SuppressionRule[]>("/notification-preferences/suppressions"),
    staleTime: 60_000,
    ...restOptions,
    enabled: !!orgId && (enabledOption ?? true),
  });
};

export const useCreateSuppression = () => {
  const queryClient = useQueryClient();
  return useMutation<SuppressionRule, Error, CreateSuppressionInput>({
    mutationKey: ["notifications", "suppressions", "create"],
    mutationFn: (dto) => apiClient.post<SuppressionRule>("/notification-preferences/suppressions", dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.suppressions() });
    },
  });
};

export const useRemoveSuppression = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, number>({
    mutationKey: ["notifications", "suppressions", "remove"],
    mutationFn: (suppressionId) =>
      apiClient.delete<{ success: boolean }>(`/notification-preferences/suppressions/${suppressionId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.suppressions() });
    },
  });
};
