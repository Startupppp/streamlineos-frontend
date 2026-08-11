"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";

export interface WebhookEndpoint {
  id: number;
  orgId: string;
  url: string;
  description: string | null;
  events: string[] | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookLog {
  id: number;
  endpointId: number;
  orgId: string;
  event: string;
  payload: Record<string, unknown> | null;
  statusCode: number | null;
  responseBody: string | null;
  attempt: number;
  success: boolean;
  createdAt: string;
}

export interface WebhooksPageResponse {
  data: WebhookEndpoint[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface WebhookLogsResponse {
  data: WebhookLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateWebhookInput {
  url: string;
  description?: string;
  events: string[];
}

export function useWebhooks(params: { page: number; limit: number }) {
  const canManage = useCan("settings:webhooks:manage");
  return useQuery({
    queryKey: queryKeys.webhooks.list(params),
    queryFn: () =>
      apiClient.get<WebhooksPageResponse>("/webhooks", {
        page: String(params.page),
        limit: String(params.limit),
      }),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    enabled: canManage,
  });
}

export function useWebhookLogs(
  endpointId: number | null,
  params: { page: number; limit: number },
) {
  const canManage = useCan("settings:webhooks:manage");
  return useQuery({
    queryKey: queryKeys.webhooks.logs(endpointId ?? 0, params),
    queryFn: () =>
      apiClient.get<WebhookLogsResponse>(`/webhooks/${endpointId}/logs`, {
        page: String(params.page),
        limit: String(params.limit),
      }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    enabled: canManage && endpointId !== null,
  });
}

export function useCreateWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["webhooks", "create"] as const,
    mutationFn: (data: CreateWebhookInput) =>
      apiClient.post<WebhookEndpoint>("/webhooks", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.webhooks.all }),
  });
}

export function useToggleWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["webhooks", "toggle"] as const,
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiClient.patch(`/webhooks/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.webhooks.all }),
  });
}

export function useDeleteWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["webhooks", "delete"] as const,
    mutationFn: (id: number) => apiClient.delete(`/webhooks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.webhooks.all }),
  });
}

export function useRetryDelivery(endpointId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["webhooks", "retry", endpointId] as const,
    mutationFn: (logId: number) =>
      apiClient.post<{ success: boolean }>(
        `/webhooks/${endpointId}/logs/${logId}/retry`,
        {},
        { headers: { "Idempotency-Key": crypto.randomUUID() } },
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.webhooks.logs(endpointId) }),
  });
}
