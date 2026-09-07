"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import {
  notificationPreferenceContract,
  suppressionsListContract,
  suppressionRowContract,
  notificationSuccessContract,
} from "@/hooks/api/notifications-schema";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import type {
  NotificationPreferences,
  UpdatePreferencesInput,
  SuppressionRule,
  CreateSuppressionInput,
} from "@/types/notifications";

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
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.notifications.suppressions() });
    },
  });
};
