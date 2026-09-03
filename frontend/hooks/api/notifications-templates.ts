"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { OffsetPage } from "@/hooks/api/offset-page-schema";
import { queryKeys } from "@/lib/query-keys";
import type {
  NotificationTemplate,
  SetTemplateApprovalInput,
  CreateTemplateInput,
  UpdateTemplateInput,
  TemplatePreviewResult,
} from "@/types/notifications";
import { toStringParams } from "./notifications-shared";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export const useNotificationTemplates = (
  params?: Record<string, unknown>,
  options?: Omit<UseQueryOptions<NotificationTemplate[], Error>, "queryKey" | "queryFn">,
) => {
  const canView = useCan("notifications:templates:view");
  const { enabled: enabledOption, ...restOptions } = options ?? {};
  return useQuery<NotificationTemplate[], Error>({
    queryKey: queryKeys.notifications.templates(params),
    queryFn: async ({ signal }) =>
      (await apiClient.get<OffsetPage<NotificationTemplate>>(
        "/notification-templates",
        params ? toStringParams(params) : undefined, signal,
      )).items,
    staleTime: 60_000,
    ...restOptions,
    enabled: canView && (enabledOption ?? true),
  });
};

export const useCreateNotificationTemplate = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<NotificationTemplate, Error, CreateTemplateInput>("notifications:templates:manage", {
    mutationKey: ["notifications", "templates", "create"],
    mutationFn: (dto) => apiClient.post<NotificationTemplate>("/notification-templates", dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.templates() });
    },
  });
};

export const useUpdateNotificationTemplate = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<NotificationTemplate, Error, { id: number } & UpdateTemplateInput>("notifications:templates:manage", {
    mutationKey: ["notifications", "templates", "update"],
    mutationFn: ({ id, ...dto }) =>
      apiClient.patch<NotificationTemplate>(`/notification-templates/${id}`, dto),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.templates() });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.template(vars.id) });
    },
  });
};

export const useSetTemplateApproval = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<NotificationTemplate, Error, { id: number } & SetTemplateApprovalInput>("notifications:templates:manage", {
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
  return useAuthorizedMutation<{ success: boolean }, Error, number>("notifications:templates:manage", {
    mutationKey: ["notifications", "templates", "delete"],
    mutationFn: (id) => apiClient.delete<{ success: boolean }>(`/notification-templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.templates() });
    },
  });
};

export const usePreviewTemplate = () => {
  return useAuthorizedMutation<TemplatePreviewResult, Error, { id: number; variables: Record<string, string> }>("notifications:templates:view", {
    mutationKey: ["notifications", "templates", "preview"],
    mutationFn: ({ id, variables }) =>
      apiClient.post<TemplatePreviewResult>(`/notification-templates/${id}/preview`, { variables }),
  });
};
