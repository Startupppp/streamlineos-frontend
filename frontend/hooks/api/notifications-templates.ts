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
  NotificationTemplate,
  SetTemplateApprovalInput,
  CreateTemplateInput,
  UpdateTemplateInput,
  TemplatePreviewResult,
  Broadcast,
  BroadcastListResponse,
  CreateBroadcastInput,
  UpdateBroadcastInput,
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
import { SHARED_UNREAD_PARAMS, toStringParams, useNotificationInboxInvalidation } from "./notifications-shared";

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
    staleTime: 60_000,
    ...options,
  });
};

export const useCreateNotificationTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation<NotificationTemplate, Error, CreateTemplateInput>({
    mutationKey: ["notifications", "templates", "create"],
    mutationFn: (dto) => apiClient.post<NotificationTemplate>("/notification-templates", dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.templates() });
    },
  });
};

export const useUpdateNotificationTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation<NotificationTemplate, Error, { id: number } & UpdateTemplateInput>({
    mutationKey: ["notifications", "templates", "update"],
    mutationFn: ({ id, ...dto }) =>
      apiClient.patch<NotificationTemplate>(`/notification-templates/${id}`, dto),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.templates() });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.template(vars.id) });
    },
  });
};

/**
 * COMP-004 / COMP-005. Records the provider's approval decision for a template.
 * Without this the WhatsApp and SMS gates can never be opened from the product â€”
 * `approvalStatus` defaults to NOT_REQUIRED and every send is refused.
 */
export const useSetTemplateApproval = () => {
  const queryClient = useQueryClient();
  return useMutation<NotificationTemplate, Error, { id: number } & SetTemplateApprovalInput>({
    mutationKey: ["notifications", "templates", "approval"],
    mutationFn: ({ id, ...dto }) =>
      apiClient.patch<NotificationTemplate>(`/notification-templates/${id}/approval`, dto),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.templates() });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.template(vars.id) });
    },
  });
};

export const useDeleteNotificationTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, number>({
    mutationKey: ["notifications", "templates", "delete"],
    mutationFn: (id) => apiClient.delete<{ success: boolean }>(`/notification-templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.templates() });
    },
  });
};

export const usePreviewTemplate = () => {
  return useMutation<TemplatePreviewResult, Error, { id: number; variables: Record<string, string> }>({
    mutationKey: ["notifications", "templates", "preview"],
    mutationFn: ({ id, variables }) =>
      apiClient.post<TemplatePreviewResult>(`/notification-templates/${id}/preview`, { variables }),
  });
};

