"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useGatedQuery } from "@/hooks/api/gated-query";
import type { CrmInboxCounts, CrmInboxResponse } from "@/types/crm";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { lazyContract } from "@/lib/api-envelope";

const inboxLazy = lazyContract(() =>
  import("@/hooks/api/crm/inbox-schema").then((m) => m.inboxContract),
);
const inboxCountsLazy = lazyContract(() =>
  import("@/hooks/api/crm/inbox-schema").then((m) => m.inboxCountsContract),
);
const dismissInboxItemLazy = lazyContract(() =>
  import("@/hooks/api/crm/inbox-schema").then((m) => m.dismissInboxItemContract),
);

export function useInbox() {
  return useGatedQuery("crm:leads:view", {
    queryKey: queryKeys.crmInbox.data(),
    queryFn: ({ signal }) => apiClient.get<CrmInboxResponse>("/crm/inbox", undefined, signal, inboxLazy),
    staleTime: 65_000,
    refetchInterval: 60_000,
  });
}

export function useInboxCounts() {
  return useGatedQuery("crm:leads:view", {
    queryKey: queryKeys.crmInbox.counts(),
    queryFn: ({ signal }) => apiClient.get<CrmInboxCounts>("/crm/inbox/counts", undefined, signal, inboxCountsLazy),
    staleTime: 65_000,
    refetchInterval: 60_000,
  });
}

export function useSnoozeCrmTask() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:tasks:update", {
    mutationKey: ["crm-inbox", "snooze"] as const,
    mutationFn: ({ taskId, until }: { taskId: number; until: string }) =>
      apiClient.post<{ success: boolean }>(`/crm/inbox/tasks/${taskId}/snooze`, { until }, undefined, dismissInboxItemLazy),
    onMutate: async ({ taskId }) => {
      await qc.cancelQueries({ queryKey: queryKeys.crmInbox.data() });
      const snapshot = qc.getQueryData<CrmInboxResponse>(queryKeys.crmInbox.data());
      if (snapshot) {
        qc.setQueryData<CrmInboxResponse>(queryKeys.crmInbox.data(), {
          ...snapshot,
          sections: snapshot.sections.map((s) => ({
            ...s,
            items: s.items.filter((i) => !(i.entityType === "task" && i.id === taskId)),
            total: s.items.some((i) => i.entityType === "task" && i.id === taskId)
              ? s.total - 1
              : s.total,
          })),
        });
      }
      return { snapshot };
    },
    onError: (_, _vars, ctx) => {
      if (ctx?.snapshot) {
        qc.setQueryData(queryKeys.crmInbox.data(), ctx.snapshot);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmInbox.all });
    },
  });
}

export function useCompleteCrmTask() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:tasks:update", {
    mutationKey: ["crm-inbox", "complete"] as const,
    mutationFn: ({ taskId }: { taskId: number }) =>
      apiClient.post<{ success: boolean }>(`/crm/inbox/tasks/${taskId}/complete`, {}, undefined, dismissInboxItemLazy),
    onMutate: async ({ taskId }) => {
      await qc.cancelQueries({ queryKey: queryKeys.crmInbox.data() });
      const snapshot = qc.getQueryData<CrmInboxResponse>(queryKeys.crmInbox.data());
      if (snapshot) {
        qc.setQueryData<CrmInboxResponse>(queryKeys.crmInbox.data(), {
          ...snapshot,
          sections: snapshot.sections.map((s) => ({
            ...s,
            items: s.items.filter((i) => !(i.entityType === "task" && i.id === taskId)),
            total: s.items.some((i) => i.entityType === "task" && i.id === taskId)
              ? s.total - 1
              : s.total,
          })),
        });
      }
      return { snapshot };
    },
    onError: (_, _vars, ctx) => {
      if (ctx?.snapshot) {
        qc.setQueryData(queryKeys.crmInbox.data(), ctx.snapshot);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmInbox.all });
    },
  });
}
