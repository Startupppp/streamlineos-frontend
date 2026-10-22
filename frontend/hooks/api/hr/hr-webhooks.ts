"use client";

import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { NULL_CURSOR_YET } from "@/hooks/api/cursor-page-param";
import type {
  HrWebhookSubscription,
  HrWebhookDelivery,
  HrWebhookEventsResponse,
  CreateHrWebhookInput,
  UpdateHrWebhookInput,
} from "@/types/hr/webhooks";
import { lazyContract } from "@/lib/api-envelope";

const noContentC = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);
import { queryKeyBase } from "@/lib/query-keys/base";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { hrWebhooksListKey } from "@/hooks/api/hr/hr-webhooks-schema";
import { hrWebhooksQueryOptions } from "@/hooks/api/hr/hr-webhooks-read-options";

const BASE = [...queryKeyBase, "hr", "webhooks"] as const;

export const hrWebhookKeys = {
  all: BASE,
  list: hrWebhooksListKey,
  detail: (id: number) => [...BASE, "detail", id] as const,
  deliveries: (subscriptionId: number) => [...BASE, "deliveries", subscriptionId] as const,
  events: () => [...BASE, "events"] as const,
};

type WebhookListPage = {
  data: HrWebhookSubscription[];
  pagination: { limit: number; hasMore: boolean; nextCursor: string | null };
};

type DeliveryListPage = {
  data: HrWebhookDelivery[];
  pagination: { limit: number; hasMore: boolean; nextCursor: string | null };
};

export function useHrWebhooks(params?: { limit?: number }) {
  const canManage = useCan("hr:integrations:manage");
  return useInfiniteQuery({
    ...hrWebhooksQueryOptions(params),
    queryFn: async ({ pageParam, signal }) => {
      const search = new URLSearchParams();
      if (params?.limit) search.set("limit", String(params.limit));
      if (pageParam !== null) search.set("cursor", pageParam);
      const qs = search.toString();
      return apiClient.get<WebhookListPage>(`/hr/webhooks${qs ? `?${qs}` : ""}`, undefined, signal, lazyContract(() => import("@/hooks/api/hr/hr-webhooks-schema").then(m => m.hrWebhookSubscriptionListContract)));
    },
    initialPageParam: NULL_CURSOR_YET,
    getNextPageParam: (page) => page.pagination.nextCursor ?? undefined,
    enabled: canManage,
  });
}

export function useHrWebhookEvents() {
  const canManage = useCan("hr:integrations:manage");
  return useQuery({
    queryKey: hrWebhookKeys.events(),
    queryFn: ({ signal }) => apiClient.get<HrWebhookEventsResponse>("/hr/webhooks/events", undefined, signal, lazyContract(() => import("@/hooks/api/hr/hr-webhooks-schema").then(m => m.hrWebhookEventsResponseContract))),
    staleTime: 5 * 60_000,
    enabled: canManage,
  });
}

export function useHrWebhookDeliveries(subscriptionId: number, limit = 50) {
  const canManage = useCan("hr:integrations:manage");
  return useInfiniteQuery({
    queryKey: hrWebhookKeys.deliveries(subscriptionId),
    queryFn: async ({ pageParam, signal }) => {
      const search = new URLSearchParams();
      search.set("limit", String(limit));
      if (pageParam !== null) search.set("cursor", pageParam);
      return apiClient.get<DeliveryListPage>(`/hr/webhooks/${subscriptionId}/deliveries?${search.toString()}`, undefined, signal, lazyContract(() => import("@/hooks/api/hr/hr-webhooks-schema").then(m => m.hrWebhookDeliveryListContract)));
    },
    initialPageParam: NULL_CURSOR_YET,
    getNextPageParam: (page) => page.pagination.nextCursor ?? undefined,
    enabled: canManage && subscriptionId > 0,
    staleTime: 15_000,
    ...INLINE_READ_ERROR,
  });
}

export function useCreateHrWebhook() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:integrations:manage", {
    mutationKey: [...BASE, "create"],
    mutationFn: (input: CreateHrWebhookInput) =>
      apiClient.post<HrWebhookSubscription & { secret: string }>("/hr/webhooks", input, undefined, lazyContract(() => import("@/hooks/api/hr/hr-webhooks-schema").then(m => m.hrWebhookSubscriptionWithSecretContract))),
    onSuccess: () => qc.invalidateQueries({ queryKey: hrWebhookKeys.all }),
  });
}

export function useUpdateHrWebhook() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:integrations:manage", {
    mutationKey: [...BASE, "update"],
    mutationFn: ({ webhookId, ...input }: UpdateHrWebhookInput & { webhookId: number }) =>
      apiClient.patch<HrWebhookSubscription>(`/hr/webhooks/${webhookId}`, input, undefined, lazyContract(() => import("@/hooks/api/hr/hr-webhooks-schema").then(m => m.hrWebhookSubscriptionContract))),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: hrWebhookKeys.all });
      qc.invalidateQueries({ queryKey: hrWebhookKeys.detail(vars.webhookId) });
    },
  });
}

export function useToggleHrWebhook() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:integrations:manage", {
    mutationKey: [...BASE, "toggle"],
    mutationFn: ({ webhookId, isActive }: { webhookId: number; isActive: boolean }) =>
      apiClient.patch<HrWebhookSubscription>(`/hr/webhooks/${webhookId}`, { isActive }, undefined, lazyContract(() => import("@/hooks/api/hr/hr-webhooks-schema").then(m => m.hrWebhookSubscriptionContract))),
    onMutate: async ({ webhookId, isActive }) => {
      await qc.cancelQueries({ queryKey: hrWebhookKeys.list() });
      const previous = qc.getQueryData<InfiniteData<WebhookListPage>>(hrWebhookKeys.list());
      if (previous) {
        qc.setQueryData<InfiniteData<WebhookListPage>>(hrWebhookKeys.list(), (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              data: page.data.map((s) => (s.id === webhookId ? { ...s, isActive } : s)),
            })),
          };
        });
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
    mutationFn: (webhookId: number) =>
      apiClient.delete<void>(`/hr/webhooks/${webhookId}`, undefined, undefined, noContentC),
    onSuccess: () => qc.invalidateQueries({ queryKey: hrWebhookKeys.all }),
  });
}

export function useTestHrWebhook() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:integrations:manage", {
    mutationKey: [...BASE, "test"],
    mutationFn: (webhookId: number) =>
      apiClient.post<{ deliveryId: number; event: string }>(`/hr/webhooks/${webhookId}/test`, {}, undefined, lazyContract(() => import("@/hooks/api/hr/hr-webhooks-schema").then(m => m.hrWebhookTestResponseContract))),
    onSuccess: (_, webhookId) => {
      qc.invalidateQueries({ queryKey: hrWebhookKeys.deliveries(webhookId) });
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
        undefined,
        lazyContract(() => import("@/hooks/api/hr/hr-webhooks-schema").then(m => m.successResponseContract)),
      ),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: hrWebhookKeys.deliveries(vars.subscriptionId) });
    },
  });
}
