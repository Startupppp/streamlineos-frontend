"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { CrmInboxCounts, CrmInboxResponse } from "@/types/crm";

export function useInbox() {
  return useQuery({
    queryKey: queryKeys.crmInbox.data(),
    queryFn: () => apiClient.get<CrmInboxResponse>("/crm/inbox"),
    staleTime: 65_000,
    refetchInterval: 60_000,
  });
}

export function useInboxCounts() {
  return useQuery({
    queryKey: queryKeys.crmInbox.counts(),
    queryFn: () => apiClient.get<CrmInboxCounts>("/crm/inbox/counts"),
    staleTime: 65_000,
    refetchInterval: 60_000,
  });
}

export function useSnoozeCrmTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crm-inbox", "snooze"] as const,
    mutationFn: ({ taskId, until }: { taskId: number; until: string }) =>
      apiClient.post<{ success: boolean }>(`/crm/inbox/tasks/${taskId}/snooze`, { until }),
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
    onError: (_err, _vars, ctx) => {
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
  return useMutation({
    mutationKey: ["crm-inbox", "complete"] as const,
    mutationFn: ({ taskId }: { taskId: number }) =>
      apiClient.post<{ success: boolean }>(`/crm/inbox/tasks/${taskId}/complete`, {}),
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
    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) {
        qc.setQueryData(queryKeys.crmInbox.data(), ctx.snapshot);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmInbox.all });
    },
  });
}
