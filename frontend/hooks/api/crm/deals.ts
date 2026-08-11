"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
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
  const canRead = useCan("crm:deals:read");
  return useQuery({
    queryKey: queryKeys.deals.list(filters as Record<string, unknown>),
    queryFn: () => apiClient.get<Deal[]>("/deals", filters as Record<string, unknown>),
    staleTime: 2 * 60_000,
    enabled: canRead,
  });
}

export function useDealStats() {
  const canRead = useCan("crm:deals:read");
  return useQuery<DealStats, Error>({
    queryKey: queryKeys.deals.stats(),
    queryFn: () => apiClient.get<DealStats>("/deals/stats"),
    staleTime: 2 * 60_000,
    enabled: canRead,
  });
}

export function useDealDetail(id: number) {
  const canRead = useCan("crm:deals:read");
  return useQuery({
    queryKey: queryKeys.deals.detail(id),
    queryFn: () => apiClient.get<Deal>(`/deals/${id}`),
    staleTime: 2 * 60_000,
    enabled: canRead && id > 0,
  });
}

export function useCreateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["deals", "create"] as const,
    mutationFn: (input: CreateDealInput) => apiClient.post<Deal>("/deals", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deals.all });
      qc.invalidateQueries({ queryKey: queryKeys.deals.stats() });
      qc.invalidateQueries({ queryKey: queryKeys.deals.forecast() });
    },
  });
}

export function useUpdateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["deals", "update"] as const,
    mutationFn: ({ id, ...data }: UpdateDealInput) =>
      apiClient.patch<Deal>(`/deals/${id}`, data),
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
  return useMutation({
    mutationKey: ["deals", "updateStage"] as const,
    mutationFn: ({ id, stage, lostReason, version }: UpdateDealStageInput) =>
      apiClient.patch<Deal | { approvalPending: true; approvalId: number }>(`/deals/${id}`, { stage, lostReason, version }),
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
  return useMutation({
    mutationKey: ["deals", "delete"] as const,
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/deals/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deals.all });
      qc.invalidateQueries({ queryKey: queryKeys.deals.stats() });
      qc.invalidateQueries({ queryKey: queryKeys.deals.forecast() });
    },
  });
}

export function useCloneDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["deals", "clone"] as const,
    mutationFn: (id: number) =>
      apiClient.post<Deal>(`/deals/${id}/clone`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deals.all });
      qc.invalidateQueries({ queryKey: queryKeys.deals.stats() });
      qc.invalidateQueries({ queryKey: queryKeys.deals.forecast() });
    },
  });
}

export function useDealActivities(dealId: number, limit?: number) {
  const canRead = useCan("crm:deals:read");
  return useQuery({
    queryKey: queryKeys.dealActivities.list(dealId, limit ? { limit } : undefined),
    queryFn: () =>
      apiClient.get<DealActivity[]>(
        `/deals/${dealId}/activities`,
        limit ? { limit } : undefined
      ),
    staleTime: 2 * 60_000,
    enabled: canRead && dealId > 0,
  });
}

export function useLogDealActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["dealActivities", "create"] as const,
    mutationFn: ({ dealId, ...data }: LogDealActivityInput) =>
      apiClient.post<DealActivity>(`/deals/${dealId}/activities`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.dealActivities.list(vars.dealId) });
      qc.invalidateQueries({ queryKey: queryKeys.deals.detail(vars.dealId) });
    },
  });
}

export function useDealMeetings(dealId: number) {
  const canRead = useCan("crm:deals:read");
  return useQuery({
    queryKey: queryKeys.deals.meetings(dealId),
    queryFn: () => apiClient.get<DealMeeting[]>(`/deals/${dealId}/meetings`),
    staleTime: 2 * 60_000,
    enabled: canRead && dealId > 0,
  });
}

export function useCreateDealMeeting(dealId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["deals", "meetings", "create"] as const,
    mutationFn: (input: CreateDealMeetingInput) =>
      apiClient.post<DealMeeting>(`/deals/${dealId}/meetings`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deals.meetings(dealId) });
    },
  });
}

export function useDeleteDealMeeting(dealId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["deals", "meetings", "delete"] as const,
    mutationFn: (meetingId: number) =>
      apiClient.delete<{ success: boolean }>(`/deals/${dealId}/meetings/${meetingId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deals.meetings(dealId) });
    },
  });
}

export function useWinLossAnalysis() {
  const canRead = useCan("crm:deals:read");
  return useQuery({
    queryKey: queryKeys.deals.winLoss(),
    queryFn: () => apiClient.get<WinLossAnalysis>("/deals/win-loss"),
    staleTime: 2 * 60_000,
    enabled: canRead,
  });
}

export function useDealApprovals(params?: { status?: string }) {
  const canRead = useCan("crm:deals:read");
  return useQuery({
    queryKey: queryKeys.deals.approvals(params as Record<string, unknown>),
    queryFn: () => apiClient.get<DealApproval[]>("/deals/approvals", params as Record<string, unknown>),
    staleTime: 2 * 60_000,
    enabled: canRead,
  });
}

export function useDealAging() {
  const canRead = useCan("crm:deals:read");
  return useQuery<AgingResponse>({
    queryKey: queryKeys.deals.aging(),
    queryFn: () => apiClient.get<AgingResponse>("/deals/aging"),
    staleTime: 305_000,
    refetchInterval: 300_000,
    enabled: canRead,
  });
}

export function useResolveDealApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["deals", "approvals", "resolve"] as const,
    mutationFn: (input: { approvalId: number; action: "approve" | "reject"; rejectionReason?: string }) =>
      apiClient.post("/deals/approvals", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deals.approvals() });
      qc.invalidateQueries({ queryKey: queryKeys.deals.all });
    },
  });
}

export function useForecastSnapshots(params?: { period?: string; limit?: number }) {
  const canForecast = useCan("crm:deals:forecast");
  return useQuery({
    queryKey: queryKeys.deals.forecastSnapshots(params as Record<string, unknown>),
    queryFn: () => apiClient.get<ForecastSnapshot[]>("/deals/forecast/snapshots", params as Record<string, unknown>),
    staleTime: 2 * 60_000,
    enabled: canForecast,
  });
}

export function useCaptureForecastSnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["deals", "forecast", "captureSnapshot"] as const,
    mutationFn: (input: CaptureForecastSnapshotInput) =>
      apiClient.post<ForecastSnapshot>("/deals/forecast/snapshot", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deals.forecastSnapshots() });
    },
  });
}

export function useDealCompetitors(dealId: number) {
  const canRead = useCan("crm:deals:read");
  return useQuery({
    queryKey: queryKeys.deals.competitors(dealId),
    queryFn: () => apiClient.get<DealCompetitor[]>(`/deals/${dealId}/competitors`),
    staleTime: 2 * 60_000,
    enabled: canRead && dealId > 0,
  });
}

export function useAddDealCompetitor(dealId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["deals", "competitors", "create", dealId] as const,
    mutationFn: (input: CreateDealCompetitorInput) =>
      apiClient.post<DealCompetitor>(`/deals/${dealId}/competitors`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deals.competitors(dealId) });
    },
  });
}

export function useDeleteDealCompetitor(dealId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["deals", "competitors", "delete", dealId] as const,
    mutationFn: (competitorId: string) =>
      apiClient.delete<{ success: boolean }>(`/deals/${dealId}/competitors/${competitorId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deals.competitors(dealId) });
    },
  });
}

export function useDealHealth(dealId: number) {
  const canRead = useCan("crm:deals:read");
  return useQuery({
    queryKey: queryKeys.deals.health(dealId),
    queryFn: () => apiClient.get<DealHealth>(`/deals/${dealId}/health`),
    staleTime: 5 * 60_000,
    enabled: canRead && dealId > 0,
  });
}

export function usePatchNextStep(dealId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["deals", "patchNextStep"] as const,
    mutationFn: (input: PatchNextStepInput) =>
      apiClient.patch<Deal>(`/deals/${dealId}`, { nextStep: input.nextStep }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deals.detail(dealId) });
    },
  });
}

export function useStakeholders(dealId: number) {
  const canRead = useCan("crm:deals:read");
  return useQuery({
    queryKey: queryKeys.deals.stakeholders(dealId),
    queryFn: () => apiClient.get<DealStakeholder[]>(`/deals/${dealId}/stakeholders`),
    staleTime: 2 * 60_000,
    enabled: canRead && dealId > 0,
  });
}

export function useCreateStakeholder(dealId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["deals", "stakeholders", "create", dealId] as const,
    mutationFn: (input: CreateStakeholderInput) =>
      apiClient.post<DealStakeholder>(`/deals/${dealId}/stakeholders`, input),
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
  return useMutation({
    mutationKey: ["deals", "stakeholders", "delete", dealId] as const,
    mutationFn: (stakeholderId: string) =>
      apiClient.delete<{ deleted: boolean }>(`/deals/${dealId}/stakeholders/${stakeholderId}`),
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
  return useMutation({
    mutationKey: ["deals", "forecast", "override"] as const,
    mutationFn: ({ snapshotId, ...data }: OverrideForecastInput & { snapshotId: string }) =>
      apiClient.patch<ForecastSnapshot>(`/deals/forecast/${snapshotId}/override`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deals.forecastSnapshots() });
    },
  });
}
