"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import type { OffsetPage } from "@/hooks/api/offset-page-schema";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import type {
  NotificationTemplate,
  SetTemplateApprovalInput,
  CreateTemplateInput,
  UpdateTemplateInput,
  TemplatePreviewResult,
} from "@/types/notifications";
import { toStringParams } from "./notifications-shared";
import { useCan } from "@/hooks/api/access";
import { useGatedQuery } from "@/hooks/api/gated-query";
import type { EmailTemplatePreview } from "@/hooks/api/notifications-schema";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const notificationTemplatesListContract = lazyContract(() =>
  import("@/hooks/api/notifications-schema").then(
    (m) => m.notificationTemplatesListContract,
  ),
);
const notificationTemplateContract = lazyContract(() =>
  import("@/hooks/api/notifications-schema").then(
    (m) => m.notificationTemplateContract,
  ),
);
const notificationSuccessContract = lazyContract(() =>
  import("@/hooks/api/notifications-schema").then(
    (m) => m.notificationSuccessContract,
  ),
);
const templateTestSendContract = lazyContract(() =>
  import("@/hooks/api/notifications-schema").then((m) => m.templateTestSendContract),
);
const emailTemplatePreviewsContract = lazyContract(() =>
  import("@/hooks/api/notifications-schema").then((m) => m.emailTemplatePreviewsContract),
);
const emailTemplateTestContract = lazyContract(() =>
  import("@/hooks/api/notifications-schema").then((m) => m.emailTemplateTestContract),
);
const templatePreviewContract = lazyContract(() =>
  import("@/hooks/api/notifications-schema").then(
    (m) => m.templatePreviewContract,
  ),
);

export const useNotificationTemplates = (
  params?: Record<string, unknown>,
  options?: Omit<
    UseQueryOptions<NotificationTemplate[], Error>,
    "queryKey" | "queryFn"
  >,
) => {
  const canView = useCan("notifications:templates:view");
  const { enabled: enabledOption, ...restOptions } = options ?? {};
  return useQuery<NotificationTemplate[], Error>({
    queryKey: platformCoreQueryKeys.notifications.templates(params),
    queryFn: async ({ signal }) =>
      (
        await apiClient.get<OffsetPage<NotificationTemplate>>(
          "/notification-templates",
          params ? toStringParams(params) : undefined,
          signal,
          notificationTemplatesListContract,
        )
      ).items,
    staleTime: 60_000,
    ...restOptions,
    enabled: canView && (enabledOption ?? true),
  });
};

export const useCreateNotificationTemplate = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<
    NotificationTemplate,
    Error,
    CreateTemplateInput
  >("notifications:templates:manage", {
    mutationKey: ["notifications", "templates", "create"],
    mutationFn: (dto) =>
      apiClient.post<NotificationTemplate>(
        "/notification-templates",
        dto,
        undefined,
        notificationTemplateContract,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: platformCoreQueryKeys.notifications.templates(),
      });
    },
  });
};

export const useUpdateNotificationTemplate = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<
    NotificationTemplate,
    Error,
    { templateId: number } & UpdateTemplateInput
  >("notifications:templates:manage", {
    mutationKey: ["notifications", "templates", "update"],
    mutationFn: ({ templateId, ...dto }) =>
      apiClient.patch<NotificationTemplate>(
        `/notification-templates/${templateId}`,
        dto,
        undefined,
        notificationTemplateContract,
      ),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({
        queryKey: platformCoreQueryKeys.notifications.templates(),
      });
      queryClient.invalidateQueries({
        queryKey: platformCoreQueryKeys.notifications.template(vars.templateId),
      });
    },
  });
};

export const useSetTemplateApproval = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<
    NotificationTemplate,
    Error,
    { templateId: number } & SetTemplateApprovalInput
  >("notifications:templates:manage", {
    mutationKey: ["notifications", "templates", "approval"],
    mutationFn: ({ templateId, ...dto }) =>
      apiClient.patch<NotificationTemplate>(
        `/notification-templates/${templateId}/approval`,
        dto,
        undefined,
        notificationTemplateContract,
      ),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({
        queryKey: platformCoreQueryKeys.notifications.templates(),
      });
      queryClient.invalidateQueries({
        queryKey: platformCoreQueryKeys.notifications.template(vars.templateId),
      });
    },
  });
};

export const useDeleteNotificationTemplate = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ success: boolean }, Error, number>(
    "notifications:templates:manage",
    {
      mutationKey: ["notifications", "templates", "delete"],
      mutationFn: (templateId) =>
        apiClient.delete<{ success: boolean }>(
          `/notification-templates/${templateId}`,
          undefined,
          undefined,
          notificationSuccessContract,
        ),
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: platformCoreQueryKeys.notifications.templates(),
        });
      },
    },
  );
};

export const usePreviewTemplate = () => {
  return useAuthorizedMutation<
    TemplatePreviewResult,
    Error,
    { templateId: number; variables: Record<string, string> }
  >("notifications:templates:view", {
    mutationKey: ["notifications", "templates", "preview"],
    mutationFn: ({ templateId, variables }) =>
      apiClient.post<TemplatePreviewResult>(
        `/notification-templates/${templateId}/preview`,
        { variables },
        undefined,
        templatePreviewContract,
      ),
  });
};

/** Renders and delivers one template to one member, through the real channel. */
export const useTestSendNotificationTemplate = () =>
  useAuthorizedMutation<
    { recipientId: string; channel: string; sentAt: string },
    Error,
    { templateId: number; recipientId: string; variables: Record<string, string> }
  >("notifications:templates:manage", {
    mutationKey: ["notifications", "templates", "test-send"],
    mutationFn: ({ templateId, ...dto }) =>
      apiClient.post(`/notification-templates/${templateId}/test`, dto, undefined, templateTestSendContract),
  });

/** The built-in transactional emails, rendered with sample data. */
export const useEmailTemplatePreviews = () =>
  useGatedQuery("settings:email-templates:manage", {
    queryKey: platformCoreQueryKeys.notifications.emailTemplatePreviews(),
    queryFn: ({ signal }) =>
      apiClient.get<EmailTemplatePreview[]>("/settings/email-templates/preview", undefined, signal, emailTemplatePreviewsContract),
    staleTime: 30 * 60_000,
  });

export const useSendEmailTemplateTest = () =>
  useAuthorizedMutation<{ to: string; locale: string }, Error, { templateId: string; testEmail: string; locale: string }>(
    "settings:email-templates:manage",
    {
      mutationKey: ["notifications", "email-templates", "test"],
      mutationFn: (dto) => apiClient.post("/settings/email-templates/test", dto, undefined, emailTemplateTestContract),
    },
  );
