"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { accessAndCrmQueryKeys } from "@/lib/query-keys/access-and-crm";
import { customerWorkQueryKeys } from "@/lib/query-keys/customer-work";
import { useGatedQuery } from "@/hooks/api/gated-query";
import type { OffsetPage } from "@/hooks/api/offset-page-schema";
import type {
  Deal,
  DealActivity,
  DealFilters,
  CreateDealInput,
  UpdateDealInput,
  UpdateDealStageInput,
  LogDealActivityInput,
  DealStats,
  DealMeeting,
  CreateDealMeetingInput,
  WinLossAnalysis,
  DealHealth,
  PatchNextStepInput,
} from "@/types/crm";
import type { DealStageTransition } from "@/types/crm/stage-transitions";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { lazyContract } from "@/lib/api-envelope";

const dealLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealContract));
const dealListLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealListContract));
const dealStatsLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealStatsContract));
const dealWinLossLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealWinLossContract));
const dealHealthLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealHealthContract));
const dealMeetingsListLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealMeetingsListContract));
const dealMeetingLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealMeetingContract));
const dealActivityLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealActivityContract));
const dealStageTransitionsLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealStageTransitionsContract));
const dealUpdateResultLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealUpdateResultContract));
const dealDeleteLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealDeleteContract));

export type {
  DealActivity,
  DealStats,
  DealMeeting,
  CreateDealMeetingInput,
  WinLossAnalysis,
};

export { useDealApprovals, useDealAging, useResolveDealApproval } from "./deal-approvals";
export { useForecastSnapshots, useCaptureForecastSnapshot, useOverrideForecast } from "./deal-forecast";
export {
  useDealCompetitors,
  useAddDealCompetitor,
  useDeleteDealCompetitor,
  useDealCompetitorSuggestions,
  useScanDealCompetitorSuggestions,
  useAcceptDealCompetitorSuggestion,
  useDismissDealCompetitorSuggestion,
} from "./deal-competitors";
export { useStakeholders, useCreateStakeholder, useDeleteStakeholder } from "./deal-stakeholders";

export function useDeals(filters?: DealFilters) {
  return useGatedQuery("crm:deals:read", {
    queryKey: customerWorkQueryKeys.deals.list(filters as Record<string, unknown>),
    queryFn: async ({ signal }) =>
      (await apiClient.get<OffsetPage<Deal>>("/deals", filters as Record<string, unknown>, signal, dealListLazy)).items,
    staleTime: 2 * 60_000,
  });
}

export function useDealStats() {
  return useGatedQuery<DealStats, Error>("crm:deals:read", {
    queryKey: customerWorkQueryKeys.deals.stats(),
    queryFn: ({ signal }) => apiClient.get<DealStats>("/deals/stats", undefined, signal, dealStatsLazy),
    staleTime: 2 * 60_000,
  });
}

export function useDealDetail(id: number) {
  return useGatedQuery("crm:deals:read", {
    queryKey: customerWorkQueryKeys.deals.detail(id),
    queryFn: ({ signal }) => apiClient.get<Deal>(`/deals/${id}`, undefined, signal, dealLazy),
    staleTime: 2 * 60_000,
    enabled: id > 0,
  });
}

export function useCreateDeal() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:deals:create", {
    mutationKey: ["deals", "create"] as const,
    mutationFn: (input: CreateDealInput) => apiClient.post<Deal>("/deals", input, undefined, dealLazy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerWorkQueryKeys.deals.all });
      qc.invalidateQueries({ queryKey: customerWorkQueryKeys.deals.stats() });
      qc.invalidateQueries({ queryKey: customerWorkQueryKeys.deals.forecast() });
    },
  });
}

export function useUpdateDeal() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:deals:update", {
    mutationKey: ["deals", "update"] as const,
    mutationFn: ({ id, ...data }: UpdateDealInput) =>
      apiClient.patch<Deal>(`/deals/${id}`, data, undefined, dealLazy),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: customerWorkQueryKeys.deals.all });
      qc.invalidateQueries({ queryKey: customerWorkQueryKeys.deals.detail(vars.id) });
      qc.invalidateQueries({ queryKey: customerWorkQueryKeys.deals.stats() });
      qc.invalidateQueries({ queryKey: customerWorkQueryKeys.deals.forecast() });
      qc.invalidateQueries({ queryKey: customerWorkQueryKeys.deals.winLoss() });
    },
  });
}

export function useUpdateDealStage() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:deals:update", {
    mutationKey: ["deals", "updateStage"] as const,
    mutationFn: ({ id, stage, lostReason, version }: UpdateDealStageInput) =>
      apiClient.patch<Deal | { approvalPending: true; approvalId: number }>(`/deals/${id}`, { stage, lostReason, version }, undefined, dealUpdateResultLazy),
    onMutate: async ({ id, stage }) => {
      await qc.cancelQueries({ queryKey: customerWorkQueryKeys.deals.all });
      const snapshots = qc.getQueriesData<Deal[]>({ queryKey: customerWorkQueryKeys.deals.all });
      qc.setQueriesData<Deal[]>({ queryKey: customerWorkQueryKeys.deals.all }, (old) => {
        if (!Array.isArray(old)) return old;
        return old.map((d) => (d.id === id ? { ...d, stage: stage as Deal["stage"] } : d));
      });
      return { snapshots };
    },
    onError: (_, _vars, context) => {
      if (context) {
        for (const [key, data] of context.snapshots) {
          qc.setQueryData(key, data);
        }
      }
    },
    onSettled: (_, _err, vars) => {
      qc.invalidateQueries({ queryKey: customerWorkQueryKeys.deals.all });
      qc.invalidateQueries({ queryKey: customerWorkQueryKeys.deals.detail(vars.id) });
      qc.invalidateQueries({ queryKey: customerWorkQueryKeys.deals.stats() });
      qc.invalidateQueries({ queryKey: customerWorkQueryKeys.deals.forecast() });
      qc.invalidateQueries({ queryKey: customerWorkQueryKeys.deals.winLoss() });
    },
  });
}

export function useDeleteDeal() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:deals:delete", {
    mutationKey: ["deals", "delete"] as const,
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/deals/${id}`, undefined, undefined, dealDeleteLazy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerWorkQueryKeys.deals.all });
      qc.invalidateQueries({ queryKey: customerWorkQueryKeys.deals.stats() });
      qc.invalidateQueries({ queryKey: customerWorkQueryKeys.deals.forecast() });
    },
  });
}

export function useCloneDeal() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:deals:create", {
    mutationKey: ["deals", "clone"] as const,
    mutationFn: (id: number) =>
      apiClient.post<Deal>(`/deals/${id}/clone`, {}, undefined, dealLazy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerWorkQueryKeys.deals.all });
      qc.invalidateQueries({ queryKey: customerWorkQueryKeys.deals.stats() });
      qc.invalidateQueries({ queryKey: customerWorkQueryKeys.deals.forecast() });
    },
  });
}


export function useLogDealActivity() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:deals:update", {
    mutationKey: ["dealActivities", "create"] as const,
    mutationFn: ({ dealId, ...data }: LogDealActivityInput) =>
      apiClient.post<DealActivity>(`/deals/${dealId}/activities`, data, undefined, dealActivityLazy),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: accessAndCrmQueryKeys.dealActivities.list(vars.dealId) });
      qc.invalidateQueries({ queryKey: customerWorkQueryKeys.deals.detail(vars.dealId) });
    },
  });
}

export function useDealMeetings(dealId: number) {
  return useGatedQuery("crm:deals:read", {
    queryKey: customerWorkQueryKeys.deals.meetings(dealId),
    queryFn: ({ signal }) => apiClient.get<DealMeeting[]>(`/deals/${dealId}/meetings`, undefined, signal, dealMeetingsListLazy),
    staleTime: 2 * 60_000,
    enabled: dealId > 0,
  });
}

export function useCreateDealMeeting(dealId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:deals:update", {
    mutationKey: ["deals", "meetings", "create"] as const,
    mutationFn: (input: CreateDealMeetingInput) =>
      apiClient.post<DealMeeting>(`/deals/${dealId}/meetings`, input, undefined, dealMeetingLazy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerWorkQueryKeys.deals.meetings(dealId) });
    },
  });
}

export function useDeleteDealMeeting(dealId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:deals:update", {
    mutationKey: ["deals", "meetings", "delete"] as const,
    mutationFn: (meetingId: number) =>
      apiClient.delete<{ success: boolean }>(`/deals/${dealId}/meetings/${meetingId}`, undefined, undefined, dealDeleteLazy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerWorkQueryKeys.deals.meetings(dealId) });
    },
  });
}

export function useWinLossAnalysis() {
  return useGatedQuery("crm:deals:read", {
    queryKey: customerWorkQueryKeys.deals.winLoss(),
    queryFn: ({ signal }) => apiClient.get<WinLossAnalysis>("/deals/win-loss", undefined, signal, dealWinLossLazy),
    staleTime: 2 * 60_000,
  });
}

export function useDealHealth(dealId: number) {
  return useGatedQuery("crm:deals:read", {
    queryKey: customerWorkQueryKeys.deals.health(dealId),
    queryFn: ({ signal }) => apiClient.get<DealHealth>(`/deals/${dealId}/health`, undefined, signal, dealHealthLazy),
    staleTime: 5 * 60_000,
    enabled: dealId > 0,
  });
}

export function usePatchNextStep(dealId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:deals:update", {
    mutationKey: ["deals", "patchNextStep"] as const,
    mutationFn: (input: PatchNextStepInput) =>
      apiClient.patch<Deal>(`/deals/${dealId}`, { nextStep: input.nextStep }, undefined, dealLazy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerWorkQueryKeys.deals.detail(dealId) });
    },
  });
}

/**
 * The pipeline history ticket 08 records, read where a person can see it.
 *
 * Separate from the activity timeline on purpose: a transition is a change of
 * state with an accountable actor, not something someone did, and the two are
 * modelled apart so neither can be mistaken for the other.
 */
export function useDealStageTransitions(dealId: number | null) {
  return useGatedQuery("crm:deals:read", {
    queryKey: accessAndCrmQueryKeys.crm.dealStageTransitions(dealId ?? 0),
    queryFn: ({ signal }) =>
      apiClient.get<{ data: DealStageTransition[] }>(`/deals/${dealId}/transitions`, undefined, signal, dealStageTransitionsLazy),
    staleTime: 60_000,
    enabled: !!dealId,
  });
}
