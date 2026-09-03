"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { OffsetPage } from "@/hooks/api/offset-page-schema";
import type {
  HrWebhookSubscription,
  HrWebhookDelivery,
  HrWebhookEventsResponse,
  CreateHrWebhookInput,
  UpdateHrWebhookInput,
} from "@/types/hr/webhooks";
import { queryKeyBase } from "@/lib/query-keys/base";

const BASE = [...queryKeyBase, "hr", "webhooks"] as const;

export const hrWebhookKeys = {
  all: BASE,
  list: (params?: Record<string, unknown>) => [...BASE, "list", params] as const,
  detail: (id: number) => [...BASE, "detail", id] as const,
  deliveries: (subscriptionId: number, page?: number) => [...BASE, "deliveries", subscriptionId, page] as const,
  events: () => [...BASE, "events"] as const,
};

export function useHrWebhooks(params?: { page?: number; limit?: number }) {
  const canManage = useCan("hr:integrations:manage");
  return useQuery({
    queryKey: hrWebhookKeys.list(params),
    queryFn: async ({ signal }) =>
      (await apiClient.get<OffsetPage<HrWebhookSubscription>>("/hr/webhooks", params as Record<string, unknown>, signal)).items,
    staleTime: 30_000,
    enabled: canManage,
  });
}

export function useHrWebhookEvents() {
  const canManage = useCan("hr:integrations:manage");
  return useQuery({
    queryKey: hrWebhookKeys.events(),
    queryFn: ({ signal }) => apiClient.get<HrWebhookEventsResponse>("/hr/webhooks/events", undefined, signal),
    staleTime: 5 * 60_000,
    enabled: canManage,
  });
}

export function useHrWebhookDeliveries(subscriptionId: number, page = 1, limit = 50) {
  const canManage = useCan("hr:integrations:manage");
  return useQuery({
    queryKey: hrWebhookKeys.deliveries(subscriptionId, page),
    queryFn: async ({ signal }) =>
      (await apiClient.get<OffsetPage<HrWebhookDelivery>>(`/hr/webhooks/${subscriptionId}/deliveries`, {
        page: String(page),
        limit: String(limit),
      }, signal)).items,
    enabled: canManage && subscriptionId > 0,
    staleTime: 15_000,
  });
}

export function useCreateHrWebhook() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:integrations:manage", {
    mutationKey: [...BASE, "create"],
    mutationFn: (input: CreateHrWebhookInput) =>
      apiClient.post<HrWebhookSubscription & { secret: string }>("/hr/webhooks", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: hrWebhookKeys.all }),
  });
}

export function useUpdateHrWebhook() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:integrations:manage", {
    mutationKey: [...BASE, "update"],
    mutationFn: ({ id, ...input }: UpdateHrWebhookInput & { id: number }) =>
      apiClient.patch<HrWebhookSubscription>(`/hr/webhooks/${id}`, input),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: hrWebhookKeys.all });
      qc.invalidateQueries({ queryKey: hrWebhookKeys.detail(vars.id) });
    },
  });
}

export function useToggleHrWebhook() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:integrations:manage", {
    mutationKey: [...BASE, "toggle"],
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiClient.patch<HrWebhookSubscription>(`/hr/webhooks/${id}`, { isActive }),
    onMutate: async ({ id, isActive }) => {
      await qc.cancelQueries({ queryKey: hrWebhookKeys.list() });
      const previous = qc.getQueryData<HrWebhookSubscription[]>(hrWebhookKeys.list());
      if (previous) {
        qc.setQueryData<HrWebhookSubscription[]>(hrWebhookKeys.list(), (old) =>
          (old ?? []).map((s) => (s.id === id ? { ...s, isActive } : s)),
        );
      }
      return { previous };
    },
    onError: (_, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(hrWebhookKeys.list(), ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: hrWebhookKeys.all }),
  });
}

export function useDeleteHrWebhook() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:integrations:manage", {
    mutationKey: [...BASE, "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/webhooks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: hrWebhookKeys.all }),
  });
}

export function useTestHrWebhook() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:integrations:manage", {
    mutationKey: [...BASE, "test"],
    mutationFn: (id: number) =>
      apiClient.post<{ deliveryId: number; event: string }>(`/hr/webhooks/${id}/test`, {}),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: hrWebhookKeys.deliveries(id) });
    },
  });
}

export function useRedeliverHrWebhook() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:integrations:manage", {
    mutationKey: [...BASE, "redeliver"],
    mutationFn: ({ subscriptionId, deliveryId }: { subscriptionId: number; deliveryId: number }) =>
      apiClient.post<{ success: boolean }>(
        `/hr/webhooks/${subscriptionId}/deliveries/${deliveryId}/redeliver`,
        {},
      ),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: hrWebhookKeys.deliveries(vars.subscriptionId) });
    },
  });
}
