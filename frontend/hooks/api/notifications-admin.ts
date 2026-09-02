"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
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
} from "@/types/notifications";
import { useNotificationInboxInvalidation } from "./notifications-shared";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export const useNotificationProviders = (
  options?: Omit<UseQueryOptions<NotificationProvider[], Error>, "queryKey" | "queryFn">,
) => {
  const canView = useCan("notifications:providers:view");
  const { enabled: enabledOption, ...restOptions } = options ?? {};
  return useQuery<NotificationProvider[], Error>({
    queryKey: queryKeys.notifications.providers(),
    queryFn: ({ signal }) => apiClient.get<NotificationProvider[]>("/notifications/admin/providers", undefined, signal),
    staleTime: 60_000,
    ...restOptions,
    enabled: canView && (enabledOption ?? true),
  });
};

export const useCreateNotificationProvider = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<NotificationProvider, Error, CreateProviderInput>("notifications:providers:manage", {
    mutationKey: ["notifications", "providers", "create"],
    mutationFn: (dto) => apiClient.post<NotificationProvider>("/notifications/admin/providers", dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.providers() });
    },
  });
};

export const useUpdateNotificationProvider = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<NotificationProvider, Error, { id: number } & UpdateProviderInput>("notifications:providers:manage", {
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
  return useAuthorizedMutation<{ success: boolean }, Error, number>("notifications:providers:manage", {
    mutationKey: ["notifications", "providers", "delete"],
    mutationFn: (id) => apiClient.delete<{ success: boolean }>(`/notifications/admin/providers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.providers() });
    },
  });
};

export const useTestNotificationProvider = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<TestProviderResult, Error, { id: number } & TestProviderInput>("notifications:providers:manage", {
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
  const canView = useCan("notifications:events:view");
  const { enabled: enabledOption, ...restOptions } = options ?? {};
  return useQuery<NotificationEventDefinition[], Error>({
    queryKey: queryKeys.notifications.events(),
    queryFn: ({ signal }) => apiClient.get<NotificationEventDefinition[]>("/notifications/admin/events", undefined, signal),
    staleTime: 60_000,
    ...restOptions,
    enabled: canView && (enabledOption ?? true),
  });
};

export const useUpdateNotificationEventPolicy = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<
    NotificationEventDefinition,
    Error,
    { eventKey: string } & UpdateEventPolicyInput
  >("notifications:events:manage", {
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
  return useAuthorizedMutation<DispatchResult, Error, EmitTestEventInput>("notifications:events:manage", {
    mutationKey: ["notifications", "events", "emit"],
    mutationFn: (dto) => apiClient.post<DispatchResult>("/notifications/admin/events/emit", dto),
    onSuccess: invalidateInbox,
  });
};

export const useNotificationPolicies = (
  options?: Omit<UseQueryOptions<NotificationPolicyDefault[], Error>, "queryKey" | "queryFn">,
) => {
  const canView = useCan("notifications:policy:view");
  const { enabled: enabledOption, ...restOptions } = options ?? {};
  return useQuery<NotificationPolicyDefault[], Error>({
    queryKey: queryKeys.notifications.policy(),
    queryFn: ({ signal }) => apiClient.get<NotificationPolicyDefault[]>("/notifications/admin/policy", undefined, signal),
    staleTime: 60_000,
    ...restOptions,
    enabled: canView && (enabledOption ?? true),
  });
};

export const useUpsertNotificationPolicy = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<NotificationPolicyDefault, Error, UpsertPolicyInput>("notifications:policy:manage", {
    mutationKey: ["notifications", "policy", "upsert"],
    mutationFn: (dto) => apiClient.put<NotificationPolicyDefault>("/notifications/admin/policy", dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.policy() });
    },
  });
};
