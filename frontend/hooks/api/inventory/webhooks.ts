"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

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

export const WEBHOOK_EVENT_LABELS: Record<WebhookEventType, string> = {
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
  events: WebhookEventType[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookEvent {
  id: number;
  webhookId: number;
  eventType: WebhookEventType;
  status: "PENDING" | "DELIVERED" | "FAILED";
  responseCode?: number | null;
  attempts: number;
  createdAt: string;
  deliveredAt?: string | null;
}

interface WebhookEventsParams {
  [key: string]: unknown;
  status?: "PENDING" | "DELIVERED" | "FAILED";
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
  return useQuery<Webhook[], Error>({
    queryKey: queryKeys.inventory.webhooks(),
    queryFn: () => apiClient.get<Webhook[]>("/inventory/webhooks"),
    staleTime: 60_000,
  });
}

export function useCreateWebhook() {
  const qc = useQueryClient();
  return useMutation<
    Webhook,
    Error,
    { url: string; events: WebhookEventType[]; isActive?: boolean }
  >({
    mutationKey: ["inventory", "webhook", "create"],
    mutationFn: (data) => apiClient.post<Webhook>("/inventory/webhooks", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.webhooks() });
    },
  });
}

export function useUpdateWebhook() {
  const qc = useQueryClient();
  return useMutation<
    Webhook,
    Error,
    { webhookId: number; url?: string; events?: WebhookEventType[]; isActive?: boolean }
  >({
    mutationKey: ["inventory", "webhook", "update"],
    mutationFn: ({ webhookId, ...data }) =>
      apiClient.patch<Webhook>(`/inventory/webhooks/${webhookId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.webhooks() });
    },
  });
}

export function useDeleteWebhook() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationKey: ["inventory", "webhook", "delete"],
    mutationFn: (webhookId) => apiClient.delete<void>(`/inventory/webhooks/${webhookId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.webhooks() });
    },
  });
}

export function useWebhookEvents(webhookId: number, params?: WebhookEventsParams) {
  return useQuery<WebhookEventsResponse, Error>({
    queryKey: queryKeys.inventory.webhookEvents(webhookId, params),
    queryFn: () =>
      apiClient.get<WebhookEventsResponse>(`/inventory/webhooks/${webhookId}/events`, {
        ...(params?.status ? { status: params.status } : {}),
        ...(params?.page ? { page: String(params.page) } : {}),
        ...(params?.limit ? { limit: String(params.limit) } : {}),
      }),
    enabled: webhookId > 0,
    staleTime: 30_000,
  });
}

export function useRetryWebhookEvent() {
  const qc = useQueryClient();
  return useMutation<WebhookEvent, Error, { webhookId: number; eventId: number }>({
    mutationKey: ["inventory", "webhook", "event", "retry"],
    mutationFn: ({ eventId }) =>
      apiClient.post<WebhookEvent>(`/inventory/webhooks/events/${eventId}/retry`),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.webhookEvents(vars.webhookId) });
    },
  });
}
