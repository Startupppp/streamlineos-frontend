"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
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

const notificationProvidersListContract = lazyContract(() =>
  import("@/hooks/api/notifications-schema").then((m) => m.notificationProvidersListContract),
);
const notificationProviderContract = lazyContract(() =>
  import("@/hooks/api/notifications-schema").then((m) => m.notificationProviderContract),
);
const notificationProviderTestContract = lazyContract(() =>
  import("@/hooks/api/notifications-schema").then((m) => m.notificationProviderTestContract),
);
const notificationEventsListContract = lazyContract(() =>
  import("@/hooks/api/notifications-schema").then((m) => m.notificationEventsListContract),
);
const notificationEventDefinitionContract = lazyContract(() =>
  import("@/hooks/api/notifications-schema").then((m) => m.notificationEventDefinitionContract),
);
const notificationPoliciesListContract = lazyContract(() =>
  import("@/hooks/api/notifications-schema").then((m) => m.notificationPoliciesListContract),
);
const notificationPolicyRowContract = lazyContract(() =>
  import("@/hooks/api/notifications-schema").then((m) => m.notificationPolicyRowContract),
);
const notificationSuccessContract = lazyContract(() =>
  import("@/hooks/api/notifications-schema").then((m) => m.notificationSuccessContract),
);
const notificationEmitContract = lazyContract(() =>
  import("@/hooks/api/notifications-schema").then((m) => m.notificationEmitContract),
);

export const useNotificationProviders = (
  options?: Omit<UseQueryOptions<NotificationProvider[], Error>, "queryKey" | "queryFn">,
) => {
  const canView = useCan("notifications:providers:view");
  const { enabled: enabledOption, ...restOptions } = options ?? {};
  return useQuery<NotificationProvider[], Error>({
    queryKey: platformCoreQueryKeys.notifications.providers(),
    queryFn: ({ signal }) => apiClient.get<NotificationProvider[]>("/notifications/admin/providers", undefined, signal, notificationProvidersListContract),
    staleTime: 60_000,
    ...restOptions,
    enabled: canView && (enabledOption ?? true),
  });
};

export const useCreateNotificationProvider = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<NotificationProvider, Error, CreateProviderInput>("notifications:providers:manage", {
    mutationKey: ["notifications", "providers", "create"],
    mutationFn: (dto) => apiClient.post<NotificationProvider>("/notifications/admin/providers", dto, undefined, notificationProviderContract),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.notifications.providers() });
    },
  });
};

export const useUpdateNotificationProvider = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<NotificationProvider, Error, { id: number } & UpdateProviderInput>("notifications:providers:manage", {
    mutationKey: ["notifications", "providers", "update"],
    mutationFn: ({ id, ...dto }) =>
      apiClient.patch<NotificationProvider>(`/notifications/admin/providers/${id}`, dto, undefined, notificationProviderContract),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.notifications.providers() });
    },
  });
};

export const useDeleteNotificationProvider = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ success: boolean }, Error, number>("notifications:providers:manage", {
    mutationKey: ["notifications", "providers", "delete"],
    mutationFn: (id) => apiClient.delete<{ success: boolean }>(`/notifications/admin/providers/${id}`, undefined, undefined, notificationSuccessContract),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.notifications.providers() });
    },
  });
};

export const useTestNotificationProvider = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<TestProviderResult, Error, { id: number } & TestProviderInput>("notifications:providers:manage", {
    mutationKey: ["notifications", "providers", "test"],
    mutationFn: ({ id, ...dto }) =>
      apiClient.post<TestProviderResult>(`/notifications/admin/providers/${id}/test`, dto, undefined, notificationProviderTestContract),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.notifications.providers() });
    },
  });
};

export const useNotificationEventCatalog = (
  options?: Omit<UseQueryOptions<NotificationEventDefinition[], Error>, "queryKey" | "queryFn">,
) => {
  const canView = useCan("notifications:events:view");
  const { enabled: enabledOption, ...restOptions } = options ?? {};
  return useQuery<NotificationEventDefinition[], Error>({
    queryKey: platformCoreQueryKeys.notifications.events(),
    queryFn: ({ signal }) => apiClient.get<NotificationEventDefinition[]>("/notifications/admin/events", undefined, signal, notificationEventsListContract),
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
        undefined,
        notificationEventDefinitionContract,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.notifications.events() });
    },
  });
};

export const useEmitNotificationEvent = () => {
  const { invalidateInbox } = useNotificationInboxInvalidation();
  return useAuthorizedMutation<DispatchResult, Error, EmitTestEventInput>("notifications:events:manage", {
    mutationKey: ["notifications", "events", "emit"],
    mutationFn: (dto) =>
      apiClient.post<DispatchResult>("/notifications/admin/events/emit", dto, undefined, notificationEmitContract),
    onSuccess: invalidateInbox,
  });
};

export const useNotificationPolicies = (
  options?: Omit<UseQueryOptions<NotificationPolicyDefault[], Error>, "queryKey" | "queryFn">,
) => {
  const canView = useCan("notifications:policy:view");
  const { enabled: enabledOption, ...restOptions } = options ?? {};
  return useQuery<NotificationPolicyDefault[], Error>({
    queryKey: platformCoreQueryKeys.notifications.policy(),
    queryFn: ({ signal }) => apiClient.get<NotificationPolicyDefault[]>("/notifications/admin/policy", undefined, signal, notificationPoliciesListContract),
    staleTime: 60_000,
    ...restOptions,
    enabled: canView && (enabledOption ?? true),
  });
};

export const useUpsertNotificationPolicy = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<NotificationPolicyDefault, Error, UpsertPolicyInput>("notifications:policy:manage", {
    mutationKey: ["notifications", "policy", "upsert"],
    mutationFn: (dto) => apiClient.put<NotificationPolicyDefault>("/notifications/admin/policy", dto, undefined, notificationPolicyRowContract),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.notifications.policy() });
    },
  });
};
