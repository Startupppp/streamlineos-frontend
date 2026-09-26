"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useCan } from "@/hooks/api/access";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import type {
  ContentHealthSignalType,
  DismissHealthItemParams,
} from "@/hooks/api/kb/content-health-schema";

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

export interface AssignHealthItemParams {
  pageId: number;
  kind: ContentHealthSignalType;
  assigneeMembershipId: number;
  dueAt?: string;
}

const assignHealthItemContract = lazyContract(() =>
  import("@/hooks/api/kb/content-health-schema").then((m) => m.dismissHealthItemContract),
);

export function useAssignHealthItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["knowledge", "kb", "contentHealth", "assign"],
    mutationFn: (params: AssignHealthItemParams) =>
      apiClient.post("/kb/wiki/content-health/signals/assign", params, undefined, assignHealthItemContract),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.kb.contentHealthSignalsAll,
      });
    },
  });
}

export interface BulkRepairParams {
  pageIds: number[];
  kind: ContentHealthSignalType;
  repairAction: "assign_owner" | "request_review" | "mark_needs_content";
  assigneeMembershipId?: number;
}

const bulkRepairContract = lazyContract(() =>
  import("@/hooks/api/kb/content-health-schema").then((m) => m.bulkRepairHealthItemsContract),
);

export function useBulkRepairHealthItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["knowledge", "kb", "contentHealth", "bulkRepair"],
    mutationFn: (params: BulkRepairParams) =>
      apiClient.post("/kb/wiki/content-health/signals/bulk-repair", params, undefined, bulkRepairContract),
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

const evidenceContract = lazyContract(() =>
  import("@/hooks/api/kb/content-health-schema").then((m) => m.contentHealthEvidenceContract),
);

export function useContentHealthEvidence(pageId: number | null, kind: ContentHealthSignalType | null) {
  const canManage = useCan("kb:pages:manage");
  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.contentHealthEvidence(pageId, kind),
    queryFn: ({ signal }) =>
      apiClient.get(
        "/kb/wiki/content-health/signals/evidence",
        { pageId, kind },
        signal,
        evidenceContract,
      ),
    staleTime: 60_000,
    enabled: canManage && pageId !== null && kind !== null,
  });
}

const contentHealthTrendContract = lazyContract(() =>
  import("@/hooks/api/kb/content-health-schema").then((m) => m.contentHealthTrendContract),
);

export function useContentHealthTrend() {
  const canManage = useCan("kb:pages:manage");
  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.contentHealthTrend(),
    queryFn: ({ signal }) =>
      apiClient.get("/kb/wiki/content-health/trend", undefined, signal, contentHealthTrendContract),
    staleTime: 5 * 60_000,
    enabled: canManage,
  });
}
