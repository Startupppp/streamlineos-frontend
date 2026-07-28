"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { ProjectWebhook, WebhookDelivery } from "@/types/projects";
export type { ProjectWebhook, WebhookDelivery } from "@/types/projects";

function webhookKeys(projectId: number) {
  return ["streamlineos", "projects", projectId, "webhooks"] as const;
}

export function useWebhooks(projectId: number) {
  return useQuery<ProjectWebhook[]>({
    queryKey: webhookKeys(projectId),
    queryFn: () => apiClient.get<ProjectWebhook[]>(`/build/${projectId}/webhooks`),
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

export function useWebhookDeliveries(projectId: number, webhookId: number, enabled = false) {
  return useQuery<WebhookDelivery[]>({
    queryKey: [...webhookKeys(projectId), webhookId, "deliveries"],
    queryFn: () => apiClient.get<WebhookDelivery[]>(`/build/${projectId}/webhooks/${webhookId}/deliveries`),
    enabled: enabled && !!projectId && !!webhookId,
    staleTime: 15_000,
  });
}

export function useCreateWebhook(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", projectId, "webhooks", "create"],
    mutationFn: (data: { url: string; events: string[]; secret?: string }) =>
      apiClient.post<ProjectWebhook>(`/build/${projectId}/webhooks`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: webhookKeys(projectId) }),
  });
}

export function useDeleteWebhook(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", projectId, "webhooks", "delete"],
    mutationFn: (webhookId: number) =>
      apiClient.delete(`/build/${projectId}/webhooks/${webhookId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: webhookKeys(projectId) }),
  });
}

export function useSendTestWebhook(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", projectId, "webhooks", "test"],
    mutationFn: (webhookId: number) =>
      apiClient.post<{ success: boolean; responseCode: number | null }>(
        `/build/${projectId}/webhooks/${webhookId}/test`,
        {},
      ),
    onSuccess: (_data, webhookId) => {
      void qc.invalidateQueries({ queryKey: [...webhookKeys(projectId), webhookId, "deliveries"] });
    },
  });
}
