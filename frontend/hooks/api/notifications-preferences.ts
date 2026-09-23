"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import type {
  NotificationPreferences,
  UpdatePreferencesInput,
  SuppressionRule,
  CreateSuppressionInput,
  PreferenceRuleRow,
  SetPreferenceRuleInput,
  PreferenceEventCatalogItem,
  UpdateEventPreferenceInput,
} from "@/types/notifications";

const notificationPreferenceContract = lazyContract(() =>
  import("@/hooks/api/notifications-schema").then((m) => m.notificationPreferenceContract),
);
const suppressionsListContract = lazyContract(() =>
  import("@/hooks/api/notifications-schema").then((m) => m.suppressionsListContract),
);
const suppressionRowContract = lazyContract(() =>
  import("@/hooks/api/notifications-schema").then((m) => m.suppressionRowContract),
);
const notificationSuccessContract = lazyContract(() =>
  import("@/hooks/api/notifications-schema").then((m) => m.notificationSuccessContract),
);
const preferenceRulesListContract = lazyContract(() =>
  import("@/hooks/api/notifications-schema").then((m) => m.preferenceRulesListContract),
);
const preferenceRuleOkContract = lazyContract(() =>
  import("@/hooks/api/notifications-schema").then((m) => m.preferenceRuleOkContract),
);
const preferenceEventCatalogContract = lazyContract(() =>
  import("@/hooks/api/notifications-schema").then((m) => m.preferenceEventCatalogContract),
);

export const useNotificationPreferences = (
  options?: Omit<UseQueryOptions<NotificationPreferences, Error>, "queryKey" | "queryFn">,
) => {
  const { data: session } = useSession();
  const orgId = session?.orgId;
  const { enabled: enabledOption, ...restOptions } = options ?? {};
  return useQuery<NotificationPreferences, Error>({
    queryKey: platformCoreQueryKeys.notifications.preferences(),
    queryFn: ({ signal }) => apiClient.get<NotificationPreferences>("/notification-preferences", undefined, signal, notificationPreferenceContract),
    staleTime: 5 * 60_000,
    ...restOptions,
    enabled: !!orgId && (enabledOption ?? true),
  });
};

export const useUpdateNotificationPreferences = () => {
  const queryClient = useQueryClient();
  return useMutation<NotificationPreferences, Error, UpdatePreferencesInput>({
    mutationKey: ["notifications", "preferences", "update"],
    mutationFn: (dto) => apiClient.patch<NotificationPreferences>("/notification-preferences", dto, undefined, notificationPreferenceContract),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.notifications.preferences() });
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
    queryKey: platformCoreQueryKeys.notifications.suppressions(),
    queryFn: ({ signal }) => apiClient.get<SuppressionRule[]>("/notification-preferences/suppressions", undefined, signal, suppressionsListContract),
    staleTime: 60_000,
    ...restOptions,
    enabled: !!orgId && (enabledOption ?? true),
  });
};

export const useCreateSuppression = () => {
  const queryClient = useQueryClient();
  return useMutation<SuppressionRule, Error, CreateSuppressionInput>({
    mutationKey: ["notifications", "suppressions", "create"],
    mutationFn: (dto) =>
      apiClient.post<SuppressionRule>("/notification-preferences/suppressions", dto, undefined, suppressionRowContract),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.notifications.suppressions() });
    },
  });
};

export const useRemoveSuppression = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, number>({
    mutationKey: ["notifications", "suppressions", "remove"],
    mutationFn: (suppressionId) =>
      apiClient.delete<{ success: boolean }>(
        `/notification-preferences/suppressions/${suppressionId}`,
        undefined,
        undefined,
        notificationSuccessContract,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.notifications.suppressions() });
    },
  });
};

export const useNotificationPreferenceRules = (
  options?: Omit<UseQueryOptions<PreferenceRuleRow[], Error>, "queryKey" | "queryFn">,
) => {
  const { data: session } = useSession();
  const orgId = session?.orgId;
  const { enabled: enabledOption, ...restOptions } = options ?? {};
  return useQuery<PreferenceRuleRow[], Error>({
    queryKey: platformCoreQueryKeys.notifications.preferenceRules(),
    queryFn: ({ signal }) =>
      apiClient.get<PreferenceRuleRow[]>(
        "/notification-preferences/rules",
        undefined,
        signal,
        preferenceRulesListContract,
      ),
    staleTime: 60_000,
    ...restOptions,
    enabled: !!orgId && (enabledOption ?? true),
  });
};

export const useSetNotificationPreferenceRule = () => {
  const queryClient = useQueryClient();
  return useMutation<{ ok: true }, Error, SetPreferenceRuleInput>({
    mutationKey: ["notifications", "preferences", "rules", "set"],
    mutationFn: (dto) =>
      apiClient.put<{ ok: true }>(
        "/notification-preferences/rules",
        dto,
        undefined,
        preferenceRuleOkContract,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: platformCoreQueryKeys.notifications.preferenceRules(),
      });
    },
  });
};

export const useNotificationPreferenceEventCatalog = (
  options?: Omit<UseQueryOptions<PreferenceEventCatalogItem[], Error>, "queryKey" | "queryFn">,
) => {
  const { data: session } = useSession();
  const orgId = session?.orgId;
  const { enabled: enabledOption, ...restOptions } = options ?? {};
  return useQuery<PreferenceEventCatalogItem[], Error>({
    queryKey: platformCoreQueryKeys.notifications.preferenceEventCatalog(),
    queryFn: ({ signal }) =>
      apiClient.get<PreferenceEventCatalogItem[]>(
        "/notification-preferences/events",
        undefined,
        signal,
        preferenceEventCatalogContract,
      ),
    staleTime: 5 * 60_000,
    ...restOptions,
    enabled: !!orgId && (enabledOption ?? true),
  });
};

export const useUpdateNotificationPreferenceEvent = () => {
  const queryClient = useQueryClient();
  return useMutation<
    NotificationPreferences,
    Error,
    { eventKey: string } & UpdateEventPreferenceInput
  >({
    mutationKey: ["notifications", "preferences", "events", "update"],
    mutationFn: ({ eventKey, ...body }) =>
      apiClient.patch<NotificationPreferences>(
        `/notification-preferences/events/${eventKey}`,
        body,
        undefined,
        notificationPreferenceContract,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: platformCoreQueryKeys.notifications.preferences(),
      });
      queryClient.invalidateQueries({
        queryKey: platformCoreQueryKeys.notifications.preferenceEventCatalog(),
      });
    },
  });
};
