"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  NotificationPreferences,
  UpdatePreferencesInput,
  NotificationProvider,
  CreateProviderInput,
  UpdateProviderInput,
  TestProviderInput,
  TestProviderResult,
  NotificationEventDefinition,
  UpdateEventPolicyInput,
  EmitTestEventInput,
  DispatchResult,
  NotificationPolicyDefault,
  UpsertPolicyInput,
  SuppressionRule,
  CreateSuppressionInput,
} from "@/types/notifications";
import { useNotificationInboxInvalidation } from "./notifications-shared";

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
    mutationKey: ["notifications", "preferences", "update"],
    mutationFn: (dto) => apiClient.patch<NotificationPreferences>("/notification-preferences", dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.preferences() });
    },
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

export const useNotificationProviders = (
  options?: Omit<UseQueryOptions<NotificationProvider[], Error>, "queryKey" | "queryFn">,
) => {
  return useQuery<NotificationProvider[], Error>({
    queryKey: queryKeys.notifications.providers(),
    queryFn: () => apiClient.get<NotificationProvider[]>("/notifications/admin/providers"),
    staleTime: 60_000,
    ...options,
  });
};

export const useCreateNotificationProvider = () => {
  const queryClient = useQueryClient();
  return useMutation<NotificationProvider, Error, CreateProviderInput>({
    mutationKey: ["notifications", "providers", "create"],
    mutationFn: (dto) => apiClient.post<NotificationProvider>("/notifications/admin/providers", dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.providers() });
    },
  });
};

export const useUpdateNotificationProvider = () => {
  const queryClient = useQueryClient();
  return useMutation<NotificationProvider, Error, { id: number } & UpdateProviderInput>({
    mutationKey: ["notifications", "providers", "update"],
    mutationFn: ({ id, ...dto }) =>
      apiClient.patch<NotificationProvider>(`/notifications/admin/providers/${id}`, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.providers() });
    },
  });
};

export const useDeleteNotificationProvider = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, number>({
    mutationKey: ["notifications", "providers", "delete"],
    mutationFn: (id) => apiClient.delete<{ success: boolean }>(`/notifications/admin/providers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.providers() });
    },
  });
};

export const useTestNotificationProvider = () => {
  const queryClient = useQueryClient();
  return useMutation<TestProviderResult, Error, { id: number } & TestProviderInput>({
    mutationKey: ["notifications", "providers", "test"],
    mutationFn: ({ id, ...dto }) =>
      apiClient.post<TestProviderResult>(`/notifications/admin/providers/${id}/test`, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.providers() });
    },
  });
};

export const useNotificationEventCatalog = (
  options?: Omit<UseQueryOptions<NotificationEventDefinition[], Error>, "queryKey" | "queryFn">,
) => {
  return useQuery<NotificationEventDefinition[], Error>({
    queryKey: queryKeys.notifications.events(),
    queryFn: () => apiClient.get<NotificationEventDefinition[]>("/notifications/admin/events"),
    staleTime: 60_000,
    ...options,
  });
};

export const useUpdateNotificationEventPolicy = () => {
  const queryClient = useQueryClient();
  return useMutation<
    NotificationEventDefinition,
    Error,
    { eventKey: string } & UpdateEventPolicyInput
  >({
    mutationKey: ["notifications", "events", "update"],
    mutationFn: ({ eventKey, ...dto }) =>
      apiClient.patch<NotificationEventDefinition>(
        `/notifications/admin/events/${encodeURIComponent(eventKey)}`,
        dto,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.events() });
    },
  });
};

export const useEmitNotificationEvent = () => {
  const { invalidateInbox } = useNotificationInboxInvalidation();
  return useMutation<DispatchResult, Error, EmitTestEventInput>({
    mutationKey: ["notifications", "events", "emit"],
    mutationFn: (dto) => apiClient.post<DispatchResult>("/notifications/admin/events/emit", dto),
    onSuccess: invalidateInbox,
  });
};

export const useNotificationPolicies = (
  options?: Omit<UseQueryOptions<NotificationPolicyDefault[], Error>, "queryKey" | "queryFn">,
) => {
  return useQuery<NotificationPolicyDefault[], Error>({
    queryKey: queryKeys.notifications.policy(),
    queryFn: () => apiClient.get<NotificationPolicyDefault[]>("/notifications/admin/policy"),
    staleTime: 60_000,
    ...options,
  });
};

export const useUpsertNotificationPolicy = () => {
  const queryClient = useQueryClient();
  return useMutation<NotificationPolicyDefault, Error, UpsertPolicyInput>({
    mutationKey: ["notifications", "policy", "upsert"],
    mutationFn: (dto) => apiClient.put<NotificationPolicyDefault>("/notifications/admin/policy", dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.policy() });
    },
  });
};

export const useSuppressions = (
  options?: Omit<UseQueryOptions<SuppressionRule[], Error>, "queryKey" | "queryFn">,
) => {
  return useQuery<SuppressionRule[], Error>({
    queryKey: queryKeys.notifications.suppressions(),
    queryFn: () => apiClient.get<SuppressionRule[]>("/notification-preferences/suppressions"),
    staleTime: 60_000,
    ...options,
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
