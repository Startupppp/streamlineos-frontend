"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import type { ProjectWebhook, WebhookDelivery } from "@/types/projects";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export interface WebhookListFilters {
  state?: "active" | "inactive";
  event?: string;
  q?: string;
  cursor?: number;
}

const projectWebhookPageContract = lazyContract(() =>
  import("@/hooks/api/build/build-project-schema").then((m) => m.projectWebhookPageContract),
);
const webhookDeliveryListContract = lazyContract(() =>
  import("@/hooks/api/build/build-project-schema").then((m) => m.webhookDeliveryListContract),
);
const projectWebhookRowContract = lazyContract(() =>
  import("@/hooks/api/build/build-project-schema").then((m) => m.projectWebhookRowContract),
);
const webhookTestResultContract = lazyContract(() =>
  import("@/hooks/api/build/build-project-schema").then((m) => m.webhookTestResultContract),
);
const noContentContract = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);
export type { ProjectWebhook, WebhookDelivery } from "@/types/projects";

export function useWebhooks(projectId: number, filters?: WebhookListFilters) {
  const canManage = useCan("build:manage");
  const hasFilters = filters !== undefined && Object.values(filters).some((v) => v !== undefined);
  const activeFilters = hasFilters ? filters : undefined;
  return useQuery<{ data: ProjectWebhook[]; hasMore: boolean; nextCursor: number | null }, Error, ProjectWebhook[]>({
    queryKey: buildWorkQueryKeys.projects.webhooks(projectId, activeFilters as Record<string, unknown> | undefined),
    queryFn: ({ signal }) =>
      apiClient.get<{ data: ProjectWebhook[]; hasMore: boolean; nextCursor: number | null }>(
        `/build/${projectId}/webhooks`,
        activeFilters,
        signal,
        projectWebhookPageContract,
      ),
    select: (page) => page.data,
    enabled: canManage && !!projectId,
    staleTime: 30_000,
  });
}

export function useWebhookDeliveries(projectId: number, webhookId: number, enabled = false) {
  const canManage = useCan("build:manage");
  return useQuery<WebhookDelivery[]>({
    queryKey: buildWorkQueryKeys.projects.webhookDeliveries(projectId, webhookId),
    queryFn: ({ signal }) => apiClient.get<WebhookDelivery[]>(`/build/${projectId}/webhooks/${webhookId}/deliveries`, undefined, signal, webhookDeliveryListContract),
    enabled: canManage && enabled && !!projectId && !!webhookId,
    staleTime: 15_000,
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

export function useUpdateWebhook(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:manage", {
    mutationKey: ["projects", projectId, "webhooks", "update"],
    mutationFn: ({ webhookId, isActive }: { webhookId: number; isActive: boolean }) =>
      apiClient.patch<ProjectWebhook>(`/build/${projectId}/webhooks/${webhookId}`, { isActive }, undefined, projectWebhookRowContract),
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
