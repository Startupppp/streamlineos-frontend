"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface ProjectWebhook {
  id: number;
  projectId: number;
  url: string;
  events: string[];
  isActive: boolean;
  secret?: string;
  createdAt: string;
}

export interface WebhookDelivery {
  id: number;
  webhookId: number;
  event: string;
  status: "success" | "failed" | "pending";
  responseCode: number | null;
  deliveredAt: string;
}

function webhookKeys(projectId: number) {
  return ["projects", projectId, "webhooks"] as const;
}

export function useWebhooks(projectId: number) {
  return useQuery<ProjectWebhook[]>({
    queryKey: webhookKeys(projectId),
    queryFn: () => apiClient.get<ProjectWebhook[]>(`/projects/${projectId}/webhooks`),
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

export function useWebhookDeliveries(projectId: number, webhookId: number, enabled = false) {
  return useQuery<WebhookDelivery[]>({
    queryKey: [...webhookKeys(projectId), webhookId, "deliveries"],
    queryFn: () => apiClient.get<WebhookDelivery[]>(`/projects/${projectId}/webhooks/${webhookId}/deliveries`),
    enabled: enabled && !!projectId && !!webhookId,
    staleTime: 15_000,
  });
}

export function useCreateWebhook(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", projectId, "webhooks", "create"],
    mutationFn: (data: { url: string; events: string[]; secret?: string }) =>
      apiClient.post<ProjectWebhook>(`/projects/${projectId}/webhooks`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: webhookKeys(projectId) }),
  });
}

export function useDeleteWebhook(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", projectId, "webhooks", "delete"],
    mutationFn: (webhookId: number) =>
      apiClient.delete(`/projects/${projectId}/webhooks/${webhookId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: webhookKeys(projectId) }),
  });
}
