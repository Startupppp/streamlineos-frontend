"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useCan } from "@/hooks/api/access";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import type { ContentHealthSignalType, DismissHealthItemParams } from "@/hooks/api/kb/content-health-schema";

const contentHealthSignalsContract = lazyContract(() =>
  import("@/hooks/api/kb/content-health-schema").then((m) => m.contentHealthSignalsContract),
);

const contentHealthCountsContract = lazyContract(() =>
  import("@/hooks/api/kb/content-health-schema").then((m) => m.contentHealthCountsContract),
);

const dismissHealthItemContract = lazyContract(() =>
  import("@/hooks/api/kb/content-health-schema").then((m) => m.dismissHealthItemContract),
);

export interface ContentHealthSignalsParams {
  signalType: ContentHealthSignalType;
  afterId?: number;
  limit?: number;
  spaceId?: number;
  ownerMembershipId?: number;
}

export function useContentHealthSignals(params: ContentHealthSignalsParams) {
  const canManage = useCan("kb:pages:manage");
  const queryParams: Record<string, unknown> = { ...params };
  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.contentHealthSignals(queryParams),
    queryFn: ({ signal }) =>
      apiClient.get("/kb/wiki/content-health/signals", queryParams, signal, contentHealthSignalsContract),
    staleTime: 2 * 60_000,
    enabled: canManage,
  });
}

export function useContentHealthCounts() {
  const canManage = useCan("kb:pages:manage");
  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.contentHealthCounts(),
    queryFn: ({ signal }) =>
      apiClient.get("/kb/wiki/content-health/counts", undefined, signal, contentHealthCountsContract),
    staleTime: 2 * 60_000,
    enabled: canManage,
  });
}

export function useDismissHealthItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["knowledge", "kb", "contentHealth", "dismiss"],
    mutationFn: (params: DismissHealthItemParams) =>
      apiClient.post("/kb/wiki/content-health/signals/dismiss", params, undefined, dismissHealthItemContract),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.kb.contentHealthCounts(),
      });
      void queryClient.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.kb.contentHealthSignalsAll,
      });
    },
  });
}
