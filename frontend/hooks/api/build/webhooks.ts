"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import type { ProjectWebhook, WebhookDelivery } from "@/types/projects";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { WebhookDeliveryPage, ProjectWebhookRotateSecret, WebhookImpact } from "@/hooks/api/build/webhook-lifecycle-schema";

export interface WebhookListFilters extends Record<string, unknown> {
  state?: "active" | "inactive";
  event?: string;
  q?: string;
  cursor?: number;
  from?: string;
  to?: string;
}

type WebhookPage = {
  data: ProjectWebhook[];
  hasMore: boolean;
  nextCursor: number | null;
};

const projectWebhookPageContract = lazyContract<WebhookPage>(() =>
  import("@/hooks/api/build/build-project-schema").then(
    (m) => m.projectWebhookPageContract,
  ),
);
const webhookDeliveryPageContract = lazyContract<WebhookDeliveryPage>(() =>
  import("@/hooks/api/build/webhook-lifecycle-schema").then((m) => m.webhookDeliveryPageContract),
);
const projectWebhookRowContract = lazyContract(() =>
  import("@/hooks/api/build/build-project-schema").then((m) => m.projectWebhookRowContract),
);
const webhookTestResultContract = lazyContract(() =>
  import("@/hooks/api/build/build-project-schema").then((m) => m.webhookTestResultContract),
);
const projectWebhookRotateSecretContract = lazyContract<ProjectWebhookRotateSecret>(() =>
  import("@/hooks/api/build/webhook-lifecycle-schema").then((m) => m.projectWebhookRotateSecretContract),
);
const webhookImpactContract = lazyContract<WebhookImpact>(() =>
  import("@/hooks/api/build/webhook-lifecycle-schema").then((m) => m.webhookImpactContract),
);
const webhookRetryResultContract = lazyContract(() =>
  import("@/hooks/api/build/webhook-lifecycle-schema").then((m) => m.webhookRetryResultContract),
);
const noContentContract = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);
export type { ProjectWebhook, WebhookDelivery } from "@/types/projects";

export function useWebhooks(projectId: number, filters?: WebhookListFilters) {
  const canManage = useCan("build:manage");
  const hasFilters = filters !== undefined && Object.values(filters).some((v) => v !== undefined);
  const activeFilters = hasFilters ? filters : undefined;
  return useQuery<WebhookPage>({
    queryKey: buildWorkQueryKeys.projects.webhooks(projectId, activeFilters),
    queryFn: ({ signal }) =>
      apiClient.get<WebhookPage>(
        `/build/${projectId}/webhooks`,
        activeFilters,
        signal,
        projectWebhookPageContract,
      ),
    enabled: canManage && !!projectId,
    staleTime: 30_000,
  });
}

export function useWebhookDeliveries(
  projectId: number,
  webhookId: number,
  enabled = false,
  cursor?: number,
) {
  const canManage = useCan("build:manage");
  const params = cursor !== undefined ? { cursor } : undefined;
  return useQuery<WebhookDeliveryPage>({
    queryKey: buildWorkQueryKeys.projects.webhookDeliveries(projectId, webhookId),
    queryFn: ({ signal }) =>
      apiClient.get<WebhookDeliveryPage>(
        `/build/${projectId}/webhooks/${webhookId}/deliveries`,
        params,
        signal,
        webhookDeliveryPageContract,
      ),
    enabled: canManage && enabled && !!projectId && !!webhookId,
    staleTime: 15_000,
  });
}

export function useWebhookImpact(projectId: number, webhookId: number, enabled = false) {
  const canManage = useCan("build:manage");
  return useQuery<WebhookImpact>({
    queryKey: buildWorkQueryKeys.projects.webhookImpact(projectId, webhookId),
    queryFn: ({ signal }) =>
      apiClient.get<WebhookImpact>(
        `/build/${projectId}/webhooks/${webhookId}/impact`,
        undefined,
        signal,
        webhookImpactContract,
      ),
    enabled: canManage && enabled && !!projectId && !!webhookId,
    staleTime: 30_000,
  });
}

export function useCreateWebhook(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:manage", {
    mutationKey: ["projects", projectId, "webhooks", "create"],
    mutationFn: (data: { url: string; events: string[]; secret?: string }) =>
      apiClient.post<ProjectWebhook>(`/build/${projectId}/webhooks`, data, undefined, projectWebhookRowContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.webhooks(projectId) }),
  });
}

export interface UpdateWebhookVariables {
  webhookId: number;
  version: number;
  url?: string;
  events?: string[];
  isActive?: boolean;
}

export function useUpdateWebhook(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:manage", {
    mutationKey: ["projects", projectId, "webhooks", "update"],
    mutationFn: ({ webhookId, ...body }: UpdateWebhookVariables) =>
      apiClient.patch<ProjectWebhook>(`/build/${projectId}/webhooks/${webhookId}`, body, undefined, projectWebhookRowContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.webhooks(projectId) }),
  });
}

export function useDeleteWebhook(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:manage", {
    mutationKey: ["projects", projectId, "webhooks", "delete"],
    mutationFn: (webhookId: number) =>
      apiClient.delete<void>(`/build/${projectId}/webhooks/${webhookId}`, undefined, undefined, noContentContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.webhooks(projectId) }),
  });
}

export function useSendTestWebhook(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:manage", {
    mutationKey: ["projects", projectId, "webhooks", "test"],
    mutationFn: (webhookId: number) =>
      apiClient.post<{ success: boolean; responseCode: number | null }>(
        `/build/${projectId}/webhooks/${webhookId}/test`,
        {},
        undefined,
        webhookTestResultContract,
      ),
    onSuccess: (_, webhookId) => {
      void qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.webhookDeliveries(projectId, webhookId) });
    },
  });
}

export function useRotateWebhookSecret(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:manage", {
    mutationKey: ["projects", projectId, "webhooks", "rotate-secret"],
    mutationFn: (webhookId: number) =>
      apiClient.post<ProjectWebhookRotateSecret>(
        `/build/${projectId}/webhooks/${webhookId}/rotate-secret`,
        {},
        undefined,
        projectWebhookRotateSecretContract,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.webhooks(projectId) }),
  });
}

export function useRetryDelivery(projectId: number, webhookId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:manage", {
    mutationKey: ["projects", projectId, "webhooks", webhookId, "retry"],
    mutationFn: (deliveryId: number) =>
      apiClient.post<{ success: boolean; responseCode: number | null }>(
        `/build/${projectId}/webhooks/${webhookId}/deliveries/${deliveryId}/retry`,
        {},
        undefined,
        webhookRetryResultContract,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.webhookDeliveries(projectId, webhookId) });
    },
  });
}
