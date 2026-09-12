"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { supportAndWorkflowsQueryKeys } from "@/lib/query-keys/support-and-workflows";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const webhookListContract = lazyContract(() =>
  import("@/hooks/api/webhooks-schema").then((m) => m.webhookListContract),
);
const webhookListLogsContract = lazyContract(() =>
  import("@/hooks/api/webhooks-schema").then((m) => m.webhookListLogsContract),
);
const webhookCreateContract = lazyContract(() =>
  import("@/hooks/api/webhooks-schema").then((m) => m.webhookCreateContract),
);
const webhookUpdateContract = lazyContract(() =>
  import("@/hooks/api/webhooks-schema").then((m) => m.webhookUpdateContract),
);
const webhookDeleteContract = lazyContract(() =>
  import("@/hooks/api/webhooks-schema").then((m) => m.webhookDeleteContract),
);
const webhookRotateSecretContract = lazyContract(() =>
  import("@/hooks/api/webhooks-schema").then((m) => m.webhookRotateSecretContract),
);
const webhookRetryContract = lazyContract(() =>
  import("@/hooks/api/webhooks-schema").then((m) => m.webhookRetryContract),
);

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

/**
 * Returned by create and rotate only. The plaintext secret exists in exactly
 * one response and is never readable again — the column holds ciphertext and
 * every other endpoint strips the field.
 */
export interface WebhookSecretReveal {
  secret: string;
  secretHint: string;
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
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
}

export interface WebhookLogsResponse {
  data: WebhookLog[];
  pagination: {
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
}

export interface CreateWebhookInput {
  url: string;
  description?: string;
  events: string[];
}

export function useWebhooks(params: { cursor?: string; limit: number }) {
  const canManage = useCan("settings:webhooks:manage");
  return useQuery({
    queryKey: supportAndWorkflowsQueryKeys.webhooks.list(params),
    queryFn: ({ signal }) =>
      apiClient.get<WebhooksPageResponse>("/webhooks", {
        ...(params.cursor ? { cursor: params.cursor } : {}),
        limit: String(params.limit),
      }, signal, webhookListContract),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    enabled: canManage,
  });
}

export function useWebhookLogs(
  endpointId: number | null,
  params: { cursor?: string; limit: number },
) {
  const canManage = useCan("settings:webhooks:manage");
  return useQuery({
    queryKey: supportAndWorkflowsQueryKeys.webhooks.logs(endpointId ?? 0, params),
    queryFn: ({ signal }) =>
      apiClient.get<WebhookLogsResponse>(`/webhooks/${endpointId}/logs`, {
        ...(params.cursor ? { cursor: params.cursor } : {}),
        limit: String(params.limit),
      }, signal, webhookListLogsContract),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    enabled: canManage && endpointId !== null,
  });
}

export function useCreateWebhook() {
  const qc = useQueryClient();
  return useAuthorizedMutation("settings:webhooks:manage", {
    mutationKey: ["webhooks", "create"] as const,
    mutationFn: (data: CreateWebhookInput) =>
      apiClient.post<WebhookEndpoint & WebhookSecretReveal>("/webhooks", data, undefined, webhookCreateContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: supportAndWorkflowsQueryKeys.webhooks.all }),
  });
}

export function useRotateWebhookSecret() {
  const qc = useQueryClient();
  return useAuthorizedMutation("settings:webhooks:manage", {
    mutationKey: ["webhooks", "rotate-secret"] as const,
    mutationFn: (id: number) =>
      apiClient.post<{ id: number } & WebhookSecretReveal>(
        `/webhooks/${id}/rotate-secret`,
        {},
        undefined,
        webhookRotateSecretContract,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: supportAndWorkflowsQueryKeys.webhooks.all }),
  });
}

export function useToggleWebhook() {
  const qc = useQueryClient();
  return useAuthorizedMutation("settings:webhooks:manage", {
    mutationKey: ["webhooks", "toggle"] as const,
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiClient.patch(`/webhooks/${id}`, { isActive }, undefined, webhookUpdateContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: supportAndWorkflowsQueryKeys.webhooks.all }),
  });
}

export function useDeleteWebhook() {
  const qc = useQueryClient();
  return useAuthorizedMutation("settings:webhooks:manage", {
    mutationKey: ["webhooks", "delete"] as const,
    mutationFn: (id: number) =>
      apiClient.delete(`/webhooks/${id}`, undefined, undefined, webhookDeleteContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: supportAndWorkflowsQueryKeys.webhooks.all }),
  });
}

export function useRetryDelivery(endpointId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("settings:webhooks:manage", {
    mutationKey: ["webhooks", "retry", endpointId] as const,
    mutationFn: (logId: number) =>
      apiClient.post<{ success: boolean }>(
        `/webhooks/${endpointId}/logs/${logId}/retry`,
        {},
        undefined,
        webhookRetryContract,
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: supportAndWorkflowsQueryKeys.webhooks.logs(endpointId) }),
  });
}
