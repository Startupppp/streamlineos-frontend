"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { ProjectWebhook, WebhookDelivery } from "@/types/projects";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
export type { ProjectWebhook, WebhookDelivery } from "@/types/projects";

export function useWebhooks(projectId: number) {
  const canManage = useCan("build:manage");
  return useQuery<ProjectWebhook[]>({
    queryKey: queryKeys.projects.webhooks(projectId),
    queryFn: ({ signal }) => apiClient.get<ProjectWebhook[]>(`/build/${projectId}/webhooks`, undefined, signal),
    enabled: canManage && !!projectId,
    staleTime: 30_000,
  });
}

export function useWebhookDeliveries(projectId: number, webhookId: number, enabled = false) {
  const canManage = useCan("build:manage");
  return useQuery<WebhookDelivery[]>({
    queryKey: queryKeys.projects.webhookDeliveries(projectId, webhookId),
    queryFn: ({ signal }) => apiClient.get<WebhookDelivery[]>(`/build/${projectId}/webhooks/${webhookId}/deliveries`, undefined, signal),
    enabled: canManage && enabled && !!projectId && !!webhookId,
    staleTime: 15_000,
  });
}

export function useCreateWebhook(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:manage", {
    mutationKey: ["projects", projectId, "webhooks", "create"],
    mutationFn: (data: { url: string; events: string[]; secret?: string }) =>
      apiClient.post<ProjectWebhook>(`/build/${projectId}/webhooks`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.projects.webhooks(projectId) }),
  });
}

export function useDeleteWebhook(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:manage", {
    mutationKey: ["projects", projectId, "webhooks", "delete"],
    mutationFn: (webhookId: number) =>
      apiClient.delete(`/build/${projectId}/webhooks/${webhookId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.projects.webhooks(projectId) }),
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
      ),
    onSuccess: (_, webhookId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.projects.webhookDeliveries(projectId, webhookId) });
    },
  });
}
