"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
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
  DealCompetitor,
  CreateDealCompetitorInput,
  DealHealth,
  ForecastSnapshot,
  CaptureForecastSnapshotInput,
  PatchNextStepInput,
  DealStakeholder,
  CreateStakeholderInput,
  OverrideForecastInput,
} from "@/types/crm";
import type { DealStageTransition } from "@/types/crm/stage-transitions";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { lazyContract } from "@/lib/api-envelope";

const dealLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealContract));
const dealListLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealListContract));
const dealStatsLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealStatsContract));
const dealAgingLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealAgingContract));
const dealForecastSnapshotsLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealForecastSnapshotsContract));
const dealForecastSnapshotLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealForecastSnapshotContract));
const dealWinLossLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealWinLossContract));
const dealHealthLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealHealthContract));
const dealApprovalLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealApprovalContract));
const dealApprovalsListLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealApprovalsListContract));
const dealStakeholdersListLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealStakeholdersListContract));
const dealStakeholderLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealStakeholderContract));
const dealCompetitorsListLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealCompetitorsListContract));
const dealCompetitorLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealCompetitorContract));
const dealMeetingsListLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealMeetingsListContract));
const dealMeetingLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealMeetingContract));
const dealActivityLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealActivityContract));
const dealStageTransitionsLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealStageTransitionsContract));
const dealUpdateResultLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealUpdateResultContract));
const dealDeleteLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealDeleteContract));
const stakeholderDeleteLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.stakeholderDeleteContract));


export type {
  DealActivity,
  DealStats,
  DealMeeting,
  CreateDealMeetingInput,
  WinLossAnalysis,
};

interface DealApproval {
  id: number;
  dealId: number;
  dealName: string | null;
  dealValue: string | null;
  requesterName: string | null;
  requestedStage: string;
  status: string;
  rejectionReason: string | null;
  createdAt: string | null;
  resolvedAt: string | null;
}

interface AgingDeal {
  id: number;
  name: string;
  value: string | null;
  stage: string;
  daysInStage: number;
  createdAt: string;
  updatedAt: string;
  assigneeName: string | null;
}

interface AgingResponse {
  summary: { total: number; stale: number; critical: number };
  deals: AgingDeal[];
}

export function useDeals(filters?: DealFilters) {
  return useGatedQuery("crm:deals:read", {
    queryKey: queryKeys.deals.list(filters as Record<string, unknown>),
    queryFn: async ({ signal }) =>
      (await apiClient.get<OffsetPage<Deal>>("/deals", filters as Record<string, unknown>, signal, dealListLazy)).items,
    staleTime: 2 * 60_000,
  });
}

export function useDealStats() {
  return useGatedQuery<DealStats, Error>("crm:deals:read", {
    queryKey: queryKeys.deals.stats(),
    queryFn: ({ signal }) => apiClient.get<DealStats>("/deals/stats", undefined, signal, dealStatsLazy),
    staleTime: 2 * 60_000,
  });
}

export function useDealDetail(id: number) {
  return useGatedQuery("crm:deals:read", {
    queryKey: queryKeys.deals.detail(id),
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
      qc.invalidateQueries({ queryKey: queryKeys.deals.all });
      qc.invalidateQueries({ queryKey: queryKeys.deals.stats() });
      qc.invalidateQueries({ queryKey: queryKeys.deals.forecast() });
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
      qc.invalidateQueries({ queryKey: queryKeys.deals.all });
      qc.invalidateQueries({ queryKey: queryKeys.deals.detail(vars.id) });
      qc.invalidateQueries({ queryKey: queryKeys.deals.stats() });
      qc.invalidateQueries({ queryKey: queryKeys.deals.forecast() });
      qc.invalidateQueries({ queryKey: queryKeys.deals.winLoss() });
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
      await qc.cancelQueries({ queryKey: queryKeys.deals.all });
      const snapshots = qc.getQueriesData<Deal[]>({ queryKey: queryKeys.deals.all });
      qc.setQueriesData<Deal[]>({ queryKey: queryKeys.deals.all }, (old) => {
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
      qc.invalidateQueries({ queryKey: queryKeys.deals.all });
      qc.invalidateQueries({ queryKey: queryKeys.deals.detail(vars.id) });
      qc.invalidateQueries({ queryKey: queryKeys.deals.stats() });
      qc.invalidateQueries({ queryKey: queryKeys.deals.forecast() });
      qc.invalidateQueries({ queryKey: queryKeys.deals.winLoss() });
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
      qc.invalidateQueries({ queryKey: queryKeys.deals.all });
      qc.invalidateQueries({ queryKey: queryKeys.deals.stats() });
      qc.invalidateQueries({ queryKey: queryKeys.deals.forecast() });
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
      qc.invalidateQueries({ queryKey: queryKeys.deals.all });
      qc.invalidateQueries({ queryKey: queryKeys.deals.stats() });
      qc.invalidateQueries({ queryKey: queryKeys.deals.forecast() });
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
      qc.invalidateQueries({ queryKey: queryKeys.dealActivities.list(vars.dealId) });
      qc.invalidateQueries({ queryKey: queryKeys.deals.detail(vars.dealId) });
    },
  });
}

export function useDealMeetings(dealId: number) {
  return useGatedQuery("crm:deals:read", {
    queryKey: queryKeys.deals.meetings(dealId),
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
      qc.invalidateQueries({ queryKey: queryKeys.deals.meetings(dealId) });
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
      qc.invalidateQueries({ queryKey: queryKeys.deals.meetings(dealId) });
    },
  });
}

export function useWinLossAnalysis() {
  return useGatedQuery("crm:deals:read", {
    queryKey: queryKeys.deals.winLoss(),
    queryFn: ({ signal }) => apiClient.get<WinLossAnalysis>("/deals/win-loss", undefined, signal, dealWinLossLazy),
    staleTime: 2 * 60_000,
  });
}

export function useDealApprovals(params?: { status?: string }) {
  return useGatedQuery("crm:deals:read", {
    queryKey: queryKeys.deals.approvals(params as Record<string, unknown>),
    queryFn: ({ signal }) => apiClient.get<DealApproval[]>("/deals/approvals", params as Record<string, unknown>, signal, dealApprovalsListLazy),
    staleTime: 2 * 60_000,
  });
}

export function useDealAging() {
  return useGatedQuery<AgingResponse>("crm:deals:read", {
    queryKey: queryKeys.deals.aging(),
    queryFn: ({ signal }) => apiClient.get<AgingResponse>("/deals/aging", undefined, signal, dealAgingLazy),
    staleTime: 305_000,
    refetchInterval: 300_000,
  });
}

export function useResolveDealApproval() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:deals:update", {
    mutationKey: ["deals", "approvals", "resolve"] as const,
    mutationFn: (input: { approvalId: number; action: "approve" | "reject"; rejectionReason?: string }) =>
      apiClient.post("/deals/approvals", input, undefined, dealApprovalLazy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deals.approvals() });
      qc.invalidateQueries({ queryKey: queryKeys.deals.all });
    },
  });
}

export function useForecastSnapshots(params?: { period?: string; limit?: number }) {
  return useGatedQuery("crm:deals:forecast", {
    queryKey: queryKeys.deals.forecastSnapshots(params as Record<string, unknown>),
    queryFn: ({ signal }) => apiClient.get<ForecastSnapshot[]>("/deals/forecast/snapshots", params as Record<string, unknown>, signal, dealForecastSnapshotsLazy),
    staleTime: 2 * 60_000,
  });
}

export function useCaptureForecastSnapshot() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:deals:forecast", {
    mutationKey: ["deals", "forecast", "captureSnapshot"] as const,
    mutationFn: (input: CaptureForecastSnapshotInput) =>
      apiClient.post<ForecastSnapshot>("/deals/forecast/snapshot", input, undefined, dealForecastSnapshotLazy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deals.forecastSnapshots() });
    },
  });
}

export function useDealCompetitors(dealId: number) {
  return useGatedQuery("crm:deals:read", {
    queryKey: queryKeys.deals.competitors(dealId),
    queryFn: ({ signal }) => apiClient.get<DealCompetitor[]>(`/deals/${dealId}/competitors`, undefined, signal, dealCompetitorsListLazy),
    staleTime: 2 * 60_000,
    enabled: dealId > 0,
  });
}

export function useAddDealCompetitor(dealId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:deals:update", {
    mutationKey: ["deals", "competitors", "create", dealId] as const,
    mutationFn: (input: CreateDealCompetitorInput) =>
      apiClient.post<DealCompetitor>(`/deals/${dealId}/competitors`, input, undefined, dealCompetitorLazy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deals.competitors(dealId) });
    },
  });
}

export function useDeleteDealCompetitor(dealId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:deals:update", {
    mutationKey: ["deals", "competitors", "delete", dealId] as const,
    mutationFn: (competitorId: string) =>
      apiClient.delete<{ success: boolean }>(`/deals/${dealId}/competitors/${competitorId}`, undefined, undefined, dealDeleteLazy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deals.competitors(dealId) });
    },
  });
}

export function useDealHealth(dealId: number) {
  return useGatedQuery("crm:deals:read", {
    queryKey: queryKeys.deals.health(dealId),
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
      qc.invalidateQueries({ queryKey: queryKeys.deals.detail(dealId) });
    },
  });
}

export function useStakeholders(dealId: number) {
  return useGatedQuery("crm:deals:read", {
    queryKey: queryKeys.deals.stakeholders(dealId),
    queryFn: ({ signal }) => apiClient.get<DealStakeholder[]>(`/deals/${dealId}/stakeholders`, undefined, signal, dealStakeholdersListLazy),
    staleTime: 2 * 60_000,
    enabled: dealId > 0,
  });
}

export function useCreateStakeholder(dealId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:deals:update", {
    mutationKey: ["deals", "stakeholders", "create", dealId] as const,
    mutationFn: (input: CreateStakeholderInput) =>
      apiClient.post<DealStakeholder>(`/deals/${dealId}/stakeholders`, input, undefined, dealStakeholderLazy),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: queryKeys.deals.stakeholders(dealId) });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deals.stakeholders(dealId) });
    },
  });
}

export function useDeleteStakeholder(dealId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:deals:update", {
    mutationKey: ["deals", "stakeholders", "delete", dealId] as const,
    mutationFn: (stakeholderId: string) =>
      apiClient.delete<{ deleted: boolean }>(`/deals/${dealId}/stakeholders/${stakeholderId}`, undefined, undefined, stakeholderDeleteLazy),
    onMutate: async (stakeholderId) => {
      await qc.cancelQueries({ queryKey: queryKeys.deals.stakeholders(dealId) });
      const snapshot = qc.getQueryData<DealStakeholder[]>(queryKeys.deals.stakeholders(dealId));
      qc.setQueryData<DealStakeholder[]>(queryKeys.deals.stakeholders(dealId), (old) =>
        old ? old.filter((s) => s.id !== stakeholderId) : old,
      );
      return { snapshot };
    },
    onError: (_, _vars, context) => {
      if (context?.snapshot) {
        qc.setQueryData(queryKeys.deals.stakeholders(dealId), context.snapshot);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deals.stakeholders(dealId) });
    },
  });
}

export function useOverrideForecast() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:deals:manage", {
    mutationKey: ["deals", "forecast", "override"] as const,
    mutationFn: ({ snapshotId, ...data }: OverrideForecastInput & { snapshotId: string }) =>
      apiClient.patch<ForecastSnapshot>(`/deals/forecast/${snapshotId}/override`, data, undefined, dealForecastSnapshotLazy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deals.forecastSnapshots() });
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
    queryKey: queryKeys.crm.dealStageTransitions(dealId ?? 0),
    queryFn: ({ signal }) =>
      apiClient.get<{ data: DealStageTransition[] }>(`/deals/${dealId}/transitions`, undefined, signal, dealStageTransitionsLazy),
    staleTime: 60_000,
    enabled: !!dealId,
  });
}
