"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import { lazyContract } from "@/lib/api-envelope";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const webhooksArrayContract = lazyContract(() =>
  import("@/hooks/api/inventory/webhooks-schema").then((m) => m.webhooksArrayContract),
);
const webhookDetailContract = lazyContract(() =>
  import("@/hooks/api/inventory/webhooks-schema").then((m) => m.webhookDetailContract),
);
const listWebhookEventsContract = lazyContract(() =>
  import("@/hooks/api/inventory/webhooks-schema").then((m) => m.listWebhookEventsContract),
);
const retryEventContract = lazyContract(() =>
  import("@/hooks/api/inventory/webhooks-schema").then((m) => m.retryEventContract),
);
const deleteWebhookContract = lazyContract(() =>
  import("@/hooks/api/inventory/webhooks-schema").then((m) => m.deleteWebhookContract),
);

export type WebhookEventType =
  | "inventory.product.created"
  | "inventory.stock.changed"
  | "inventory.stock.low"
  | "inventory.po.created"
  | "inventory.po.received"
  | "inventory.so.reserved"
  | "inventory.so.shipped"
  | "inventory.transfer.completed"
  | "inventory.adjustment.posted";

export const WEBHOOK_EVENT_LABELS: Record<string, string | undefined> = {
  "inventory.product.created": "Product Created",
  "inventory.stock.changed": "Stock Changed",
  "inventory.stock.low": "Stock Low",
  "inventory.po.created": "PO Created",
  "inventory.po.received": "PO Received",
  "inventory.so.reserved": "SO Reserved",
  "inventory.so.shipped": "SO Shipped",
  "inventory.transfer.completed": "Transfer Completed",
  "inventory.adjustment.posted": "Adjustment Posted",
};

export const ALL_WEBHOOK_EVENTS: WebhookEventType[] = [
  "inventory.product.created",
  "inventory.stock.changed",
  "inventory.stock.low",
  "inventory.po.created",
  "inventory.po.received",
  "inventory.so.reserved",
  "inventory.so.shipped",
  "inventory.transfer.completed",
  "inventory.adjustment.posted",
];

export interface Webhook {
  id: number;
  orgId: string;
  url: string;
  events: string[];
  isActive: boolean;
  lastDeliveryAt: string | null;
  lastDeliveryStatus: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookEvent {
  id: number;
  orgId: string;
  webhookId: number | null;
  eventType: string;
  payload: Record<string, unknown>;
  status: string;
  attempts: number;
  deliveredAt: string | null;
  createdAt: string;
}

interface WebhookEventsParams {
  [key: string]: unknown;
  status?: string;
  page?: number;
  limit?: number;
}

type WebhookEventsResponse = {
  items: WebhookEvent[];
  total: number;
  page: number;
  totalPages: number;
};

export function useWebhooks() {
  const canView = useCan("inventory:webhooks:manage");
  return useQuery<Webhook[], Error>({
    queryKey: queryKeys.inventory.webhooks(),
    queryFn: ({ signal }) => apiClient.get<Webhook[]>("/inventory/webhooks", undefined, signal, webhooksArrayContract),
    staleTime: 60_000,
    enabled: canView,
  });
}

export function useCreateWebhook() {
  const qc = useQueryClient();
  return useAuthorizedMutation<
    Webhook,
    Error,
    { url: string; events: WebhookEventType[]; isActive?: boolean }
  >("inventory:webhooks:manage", {
    mutationKey: ["inventory", "webhook", "create"],
    mutationFn: (data) => apiClient.post<Webhook>("/inventory/webhooks", data, undefined, webhookDetailContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.webhooks() });
    },
  });
}

export function useUpdateWebhook() {
  const qc = useQueryClient();
  return useAuthorizedMutation<
    Webhook,
    Error,
    { webhookId: number; url?: string; events?: WebhookEventType[]; isActive?: boolean }
  >("inventory:webhooks:manage", {
    mutationKey: ["inventory", "webhook", "update"],
    mutationFn: ({ webhookId, ...data }) =>
      apiClient.patch<Webhook>(`/inventory/webhooks/${webhookId}`, data, undefined, webhookDetailContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.webhooks() });
    },
  });
}

export function useDeleteWebhook() {
  const qc = useQueryClient();
  return useAuthorizedMutation<{ deleted: true }, Error, number>("inventory:webhooks:manage", {
    mutationKey: ["inventory", "webhook", "delete"],
    mutationFn: (webhookId) => apiClient.delete<{ deleted: true }>(`/inventory/webhooks/${webhookId}`, undefined, undefined, deleteWebhookContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.webhooks() });
    },
  });
}

export function useWebhookEvents(webhookId: number, params?: WebhookEventsParams) {
  const canView = useCan("inventory:webhooks:manage");
  return useQuery<WebhookEventsResponse, Error>({
    queryKey: queryKeys.inventory.webhookEvents(webhookId, params),
    queryFn: ({ signal }) =>
      apiClient.get<WebhookEventsResponse>(`/inventory/webhooks/${webhookId}/events`, {
        ...(params?.status ? { status: params.status } : {}),
        ...(params?.page ? { page: String(params.page) } : {}),
        ...(params?.limit ? { limit: String(params.limit) } : {}),
      }, signal, listWebhookEventsContract),
    enabled: canView && webhookId > 0,
    staleTime: 30_000,
  });
}

export function useRetryWebhookEvent() {
  const qc = useQueryClient();
  return useAuthorizedMutation<WebhookEvent, Error, { webhookId: number; eventId: number }>("inventory:webhooks:manage", {
    mutationKey: ["inventory", "webhook", "event", "retry"],
    mutationFn: ({ eventId }) =>
      apiClient.post<WebhookEvent>(`/inventory/webhooks/events/${eventId}/retry`, undefined, undefined, retryEventContract),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.webhookEvents(vars.webhookId) });
    },
  });
}
