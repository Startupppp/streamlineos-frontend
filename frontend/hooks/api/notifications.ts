"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  Notification,
  UnreadCount,
  NotificationListParams,
  NotificationTemplate,
  CreateTemplateInput,
  UpdateTemplateInput,
  TemplatePreviewResult,
  Broadcast,
  CreateBroadcastInput,
  UpdateBroadcastInput,
  NotificationPreferences,
  UpdatePreferencesInput,
  NotificationAnalyticsOverview,
  NotificationAnalyticsByCategory,
  NotificationAnalyticsByPriority,
  NotificationAnalyticsByChannel,
  NotificationAuditLogListResult,
} from "@/types/notifications";

function toStringParams(params: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => [k, String(v)]),
  );
}

export const useNotifications = (
  params?: NotificationListParams,
  options?: Omit<UseQueryOptions<Notification[], Error>, "queryKey" | "queryFn">,
) => {
  return useQuery<Notification[], Error>({
    queryKey: queryKeys.notifications.list(params as Record<string, unknown>),
    queryFn: () =>
      apiClient.get<Notification[]>(
        "/notifications",
        params ? toStringParams(params as Record<string, unknown>) : undefined,
      ),
    staleTime: 30_000,
    ...options,
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
    refetchInterval: 60_000,
    staleTime: 30_000,
    ...options,
    enabled: !!orgId,
  });
};

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, number>({
    mutationKey: ["notifications", "mark-read"],
    mutationFn: (id) => apiClient.patch<{ success: boolean }>(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
};

export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();
  return useMutation<
    { success: boolean },
    Error,
    void,
    { previousCount: UnreadCount | undefined }
  >({
    mutationKey: ["notifications", "mark-all-read"],
    mutationFn: () => apiClient.patch<{ success: boolean }>("/notifications/read-all"),
    onMutate: async () => {
      const unreadKey = queryKeys.notifications.unreadCount();
      await queryClient.cancelQueries({ queryKey: unreadKey });
      const previousCount = queryClient.getQueryData<UnreadCount>(unreadKey);
      queryClient.setQueryData<UnreadCount>(unreadKey, { count: 0 });
      return { previousCount };
    },
    onError: (_error, _vars, context) => {
      if (context?.previousCount !== undefined) {
        queryClient.setQueryData(queryKeys.notifications.unreadCount(), context.previousCount);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
};

export const useArchiveNotification = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, number>({
    mutationKey: ["notifications", "archive"],
    mutationFn: (id) => apiClient.patch<{ success: boolean }>(`/notifications/${id}/archive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
};

export const useUnarchiveNotification = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, number>({
    mutationFn: (id) => apiClient.patch<{ success: boolean }>(`/notifications/${id}/unarchive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
};

export const useDeleteNotification = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, number>({
    mutationKey: ["notifications", "delete"],
    mutationFn: (id) => apiClient.delete<{ success: boolean }>(`/notifications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
};

export const usePinNotification = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, number>({
    mutationKey: ["notifications", "pin"],
    mutationFn: (id) => apiClient.patch<{ success: boolean }>(`/notifications/${id}/pin`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
};

export const useUnpinNotification = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, number>({
    mutationKey: ["notifications", "unpin"],
    mutationFn: (id) => apiClient.patch<{ success: boolean }>(`/notifications/${id}/unpin`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
};

export const useSnoozeNotification = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, { id: number; snoozedUntil: string }>({
    mutationFn: ({ id, snoozedUntil }) =>
      apiClient.patch<{ success: boolean }>(`/notifications/${id}/snooze`, { snoozedUntil }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
};

export const useBulkMarkRead = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, number[]>({
    mutationKey: ["notifications", "bulk-mark-read"],
    mutationFn: (ids) => apiClient.post<{ success: boolean }>("/notifications/bulk/read", { ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
};

export const useBulkArchive = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, number[]>({
    mutationKey: ["notifications", "bulk-archive"],
    mutationFn: (ids) => apiClient.post<{ success: boolean }>("/notifications/bulk/archive", { ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
};

export const useBulkDelete = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, number[]>({
    mutationKey: ["notifications", "bulk-delete"],
    mutationFn: (ids) => apiClient.post<{ success: boolean }>("/notifications/bulk/delete", { ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
};

export const useNotificationTemplates = (
  params?: Record<string, unknown>,
  options?: Omit<UseQueryOptions<NotificationTemplate[], Error>, "queryKey" | "queryFn">,
) => {
  return useQuery<NotificationTemplate[], Error>({
    queryKey: queryKeys.notifications.templates(params),
    queryFn: () =>
      apiClient.get<NotificationTemplate[]>(
        "/notification-templates",
        params ? toStringParams(params) : undefined,
      ),
    ...options,
  });
};

export const useCreateNotificationTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation<NotificationTemplate, Error, CreateTemplateInput>({
    mutationFn: (dto) => apiClient.post<NotificationTemplate>("/notification-templates", dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.templates() });
    },
  });
};

export const useUpdateNotificationTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation<NotificationTemplate, Error, { id: number } & UpdateTemplateInput>({
    mutationFn: ({ id, ...dto }) =>
      apiClient.patch<NotificationTemplate>(`/notification-templates/${id}`, dto),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.templates() });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.template(vars.id) });
    },
  });
};

export const useDeleteNotificationTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, number>({
    mutationFn: (id) => apiClient.delete<{ success: boolean }>(`/notification-templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.templates() });
    },
  });
};

export const usePreviewTemplate = () => {
  return useMutation<TemplatePreviewResult, Error, { id: number; variables: Record<string, string> }>({
    mutationFn: ({ id, variables }) =>
      apiClient.post<TemplatePreviewResult>(`/notification-templates/${id}/preview`, { variables }),
  });
};

export const useBroadcasts = (
  params?: Record<string, unknown>,
  options?: Omit<UseQueryOptions<Broadcast[], Error>, "queryKey" | "queryFn">,
) => {
  return useQuery<Broadcast[], Error>({
    queryKey: queryKeys.notifications.broadcasts(params),
    queryFn: () =>
      apiClient.get<Broadcast[]>(
        "/broadcasts",
        params ? toStringParams(params) : undefined,
      ),
    ...options,
  });
};

export const useCreateBroadcast = () => {
  const queryClient = useQueryClient();
  return useMutation<Broadcast, Error, CreateBroadcastInput>({
    mutationFn: (dto) => apiClient.post<Broadcast>("/broadcasts", dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.broadcasts() });
    },
  });
};

export const useUpdateBroadcast = () => {
  const queryClient = useQueryClient();
  return useMutation<Broadcast, Error, { id: number } & UpdateBroadcastInput>({
    mutationFn: ({ id, ...dto }) => apiClient.patch<Broadcast>(`/broadcasts/${id}`, dto),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.broadcasts() });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.broadcast(vars.id) });
    },
  });
};

export const usePublishBroadcast = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, number>({
    mutationFn: (id) => apiClient.post<{ success: boolean }>(`/broadcasts/${id}/publish`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.broadcasts() });
    },
  });
};

export const useCancelBroadcast = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, number>({
    mutationFn: (id) => apiClient.post<{ success: boolean }>(`/broadcasts/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.broadcasts() });
    },
  });
};

export const useDeleteBroadcast = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, number>({
    mutationFn: (id) => apiClient.delete<{ success: boolean }>(`/broadcasts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.broadcasts() });
    },
  });
};

export const useNotificationPreferences = (
  options?: Omit<UseQueryOptions<NotificationPreferences, Error>, "queryKey" | "queryFn">,
) => {
  return useQuery<NotificationPreferences, Error>({
    queryKey: queryKeys.notifications.preferences(),
    queryFn: () => apiClient.get<NotificationPreferences>("/notification-preferences"),
    staleTime: 5 * 60_000,
    ...options,
  });
};

export const useUpdateNotificationPreferences = () => {
  const queryClient = useQueryClient();
  return useMutation<NotificationPreferences, Error, UpdatePreferencesInput>({
    mutationFn: (dto) => apiClient.patch<NotificationPreferences>("/notification-preferences", dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.preferences() });
    },
  });
};

export const useNotificationAnalytics = (
  days = 30,
  options?: Omit<UseQueryOptions<NotificationAnalyticsOverview, Error>, "queryKey" | "queryFn">,
) => {
  return useQuery<NotificationAnalyticsOverview, Error>({
    queryKey: queryKeys.notifications.analytics(days),
    queryFn: () =>
      apiClient.get<NotificationAnalyticsOverview>("/notification-analytics", { days: String(days) }),
    staleTime: 5 * 60_000,
    ...options,
  });
};

export const useNotificationAnalyticsByCategory = (
  days = 30,
  options?: Omit<UseQueryOptions<NotificationAnalyticsByCategory[], Error>, "queryKey" | "queryFn">,
) => {
  return useQuery<NotificationAnalyticsByCategory[], Error>({
    queryKey: [...queryKeys.notifications.analytics(days), "categories"],
    queryFn: () =>
      apiClient.get<NotificationAnalyticsByCategory[]>("/notification-analytics/categories", {
        days: String(days),
      }),
    staleTime: 5 * 60_000,
    ...options,
  });
};

export const useNotificationAnalyticsByPriority = (
  days = 30,
  options?: Omit<UseQueryOptions<NotificationAnalyticsByPriority[], Error>, "queryKey" | "queryFn">,
) => {
  return useQuery<NotificationAnalyticsByPriority[], Error>({
    queryKey: [...queryKeys.notifications.analytics(days), "priorities"],
    queryFn: () =>
      apiClient.get<NotificationAnalyticsByPriority[]>("/notification-analytics/priorities", {
        days: String(days),
      }),
    staleTime: 5 * 60_000,
    ...options,
  });
};

export const useNotificationAnalyticsByChannel = (
  days = 30,
  options?: Omit<UseQueryOptions<NotificationAnalyticsByChannel[], Error>, "queryKey" | "queryFn">,
) => {
  return useQuery<NotificationAnalyticsByChannel[], Error>({
    queryKey: [...queryKeys.notifications.analytics(days), "channels"],
    queryFn: () =>
      apiClient.get<NotificationAnalyticsByChannel[]>("/notification-analytics/channels", {
        days: String(days),
      }),
    staleTime: 5 * 60_000,
    ...options,
  });
};

export const useNotificationQueue = (
  options?: Omit<UseQueryOptions<Notification[], Error>, "queryKey" | "queryFn">,
) => {
  return useQuery<Notification[], Error>({
    queryKey: queryKeys.notifications.queue(),
    queryFn: () => apiClient.get<Notification[]>("/notification-queue"),
    staleTime: 30_000,
    ...options,
  });
};

export const useFailedNotifications = (
  options?: Omit<UseQueryOptions<Notification[], Error>, "queryKey" | "queryFn">,
) => {
  return useQuery<Notification[], Error>({
    queryKey: queryKeys.notifications.queueFailed(),
    queryFn: () => apiClient.get<Notification[]>("/notification-queue/failed"),
    staleTime: 30_000,
    ...options,
  });
};

export const useRetryNotification = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, number>({
    mutationFn: (id) => apiClient.post<{ success: boolean }>(`/notification-queue/${id}/retry`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.queue() });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.queueFailed() });
    },
  });
};

export const useApproveNotification = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, number>({
    mutationKey: ["notifications", "approve"],
    mutationFn: (id) => apiClient.post<{ success: boolean }>(`/notifications/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
};

export const useRejectNotification = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, number>({
    mutationKey: ["notifications", "reject"],
    mutationFn: (id) => apiClient.post<{ success: boolean }>(`/notifications/${id}/reject`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
};

export const useNotificationAuditLogs = (
  params?: { page?: number; pageSize?: number; action?: string; dateFrom?: string; dateTo?: string },
  options?: Omit<UseQueryOptions<NotificationAuditLogListResult, Error>, "queryKey" | "queryFn">,
) => {
  return useQuery<NotificationAuditLogListResult, Error>({
    queryKey: queryKeys.notifications.auditLogs(params as Record<string, unknown>),
    queryFn: () =>
      apiClient.get<NotificationAuditLogListResult>(
        "/notifications/audit",
        params ? toStringParams(params as Record<string, unknown>) : undefined,
      ),
    staleTime: 30_000,
    ...options,
  });
};
