"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
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

export const useNotificationTemplates = (
  params?: Record<string, unknown>,
  options?: Omit<UseQueryOptions<NotificationTemplate[], Error>, "queryKey" | "queryFn">,
) => {
  const canView = useCan("notifications:templates:view");
  const { enabled: enabledOption, ...restOptions } = options ?? {};
  return useQuery<NotificationTemplate[], Error>({
    queryKey: queryKeys.notifications.templates(params),
    queryFn: () =>
      apiClient.get<NotificationTemplate[]>(
        "/notification-templates",
        params ? toStringParams(params) : undefined,
      ),
    staleTime: 60_000,
    ...restOptions,
    enabled: canView && (enabledOption ?? true),
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
