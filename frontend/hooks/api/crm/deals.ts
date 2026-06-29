"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  Deal,
  DealActivity,
  DealFilters,
  CreateDealInput,
  UpdateDealInput,
  UpdateDealStageInput,
  LogDealActivityInput,
  DealStats,
  DealForecast,
  DealMeeting,
  CreateDealMeetingInput,
  WinLossAnalysis,
  SalesQuota,
} from "@/types/crm";

export type {
  DealActivity,
  DealStats,
  DealForecast,
  DealMeeting,
  CreateDealMeetingInput,
  WinLossAnalysis,
  SalesQuota,
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
  return useQuery({
    queryKey: queryKeys.deals.list(filters as Record<string, unknown>),
    queryFn: () => apiClient.get<Deal[]>("/deals", filters as Record<string, unknown>),
    staleTime: 2 * 60_000,
  });
}

export function useDealStats() {
  return useQuery<DealStats, Error>({
    queryKey: queryKeys.deals.stats(),
    queryFn: () => apiClient.get<DealStats>("/deals/stats"),
    staleTime: 2 * 60_000,
  });
}

export function useDealForecast() {
  return useQuery({
    queryKey: queryKeys.deals.forecast(),
    queryFn: () => apiClient.get<DealForecast>("/deals/forecast"),
    staleTime: 5 * 60_000,
  });
}

export function useDealDetail(id: number) {
  return useQuery({
    queryKey: queryKeys.deals.detail(id),
    queryFn: () => apiClient.get<Deal>(`/deals/${id}`),
    enabled: id > 0,
    staleTime: 2 * 60_000,
  });
}

export function useCreateDeal() {
  const qc = useQueryClient();
  return useMutation({
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
    mutationFn: ({ id, stage, lostReason, version }: UpdateDealStageInput) =>
      apiClient.patch<Deal>(`/deals/${id}`, { stage, lostReason, version }),
    onMutate: async ({ id, stage }) => {
      await qc.cancelQueries({ queryKey: queryKeys.deals.all });
      const previous = qc.getQueryData<Deal[]>(queryKeys.deals.all);
      if (previous) {
        qc.setQueryData<Deal[]>(
          queryKeys.deals.all,
          previous.map((d) => (d.id === id ? { ...d, stage: stage as Deal["stage"] } : d))
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(queryKeys.deals.all, context.previous);
      }
    },
    onSettled: (_data, _err, vars) => {
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
  return useQuery({
    queryKey: queryKeys.dealActivities.list(dealId, limit ? { limit } : undefined),
    queryFn: () =>
      apiClient.get<DealActivity[]>(
        `/deals/${dealId}/activities`,
        limit ? { limit } : undefined
      ),
    staleTime: 2 * 60_000,
    enabled: dealId > 0,
  });
}

export function useLogDealActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dealId, ...data }: LogDealActivityInput) =>
      apiClient.post<DealActivity>(`/deals/${dealId}/activities`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.dealActivities.list(vars.dealId) });
      qc.invalidateQueries({ queryKey: queryKeys.deals.detail(vars.dealId) });
    },
  });
}

export function useDealMeetings(dealId: number) {
  return useQuery({
    queryKey: queryKeys.deals.meetings(dealId),
    queryFn: () => apiClient.get<DealMeeting[]>(`/deals/${dealId}/meetings`),
    staleTime: 2 * 60_000,
    enabled: dealId > 0,
  });
}

export function useCreateDealMeeting(dealId: number) {
  const qc = useQueryClient();
  return useMutation({
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
    mutationFn: (meetingId: number) =>
      apiClient.delete<{ success: boolean }>(`/deals/${dealId}/meetings/${meetingId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deals.meetings(dealId) });
    },
  });
}

export function useWinLossAnalysis() {
  return useQuery({
    queryKey: queryKeys.deals.winLoss(),
    queryFn: () => apiClient.get<WinLossAnalysis>("/deals/win-loss"),
    staleTime: 2 * 60_000,
  });
}

export function useDealApprovals(params?: { status?: string }) {
  return useQuery({
    queryKey: [...queryKeys.deals.all, "approvals", params] as const,
    queryFn: () => apiClient.get<DealApproval[]>("/deals/approvals", params as Record<string, unknown>),
    staleTime: 2 * 60_000,
  });
}

export function useDealAging() {
  return useQuery<AgingResponse>({
    queryKey: queryKeys.deals.aging(),
    queryFn: () => apiClient.get<AgingResponse>("/deals/aging"),
    staleTime: 5 * 60_000,
    refetchInterval: 300_000,
  });
}

export function useResolveDealApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { approvalId: number; action: "approve" | "reject"; rejectionReason?: string }) =>
      apiClient.post("/deals/approvals", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...queryKeys.deals.all, "approvals"] });
      qc.invalidateQueries({ queryKey: queryKeys.deals.all });
    },
  });
}

export function useSalesQuotas(params?: { userId?: string; period?: string }) {
  return useQuery({
    queryKey: queryKeys.salesQuotas.list(params as Record<string, unknown>),
    queryFn: () => apiClient.get<SalesQuota[]>("/sales/quotas", params as Record<string, unknown>),
    staleTime: 2 * 60_000,
  });
}

export function useCreateSalesQuota() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { userId: string; period: string; startDate: string; endDate: string; targetRevenue: string; notes?: string }) =>
      apiClient.post<SalesQuota>("/sales/quotas", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.salesQuotas.all });
    },
  });
}

export interface CommissionItem {
  id: number;
  userName: string | null;
  dealName: string | null;
  dealValue: string;
  commissionRate: string;
  commissionAmount: string;
  status: string;
  createdAt: string | null;
}

export interface CommissionRule {
  id: number;
  name: string;
  type: string;
  flatRate: string | null;
}

export function useCommissions(params?: { userId?: string; status?: string }) {
  return useQuery({
    queryKey: [...queryKeys.deals.all, "commissions", params] as const,
    queryFn: () => apiClient.get<{ items: CommissionItem[]; totalPending: number; totalPaid: number }>("/sales/commissions", params as Record<string, unknown>),
    staleTime: 2 * 60_000,
  });
}

export function useUpdateCommissionStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: "approved" | "paid" }) =>
      apiClient.patch(`/sales/commissions/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.deals.all, "commissions"] }),
  });
}

export function useCommissionRules() {
  return useQuery({
    queryKey: [...queryKeys.deals.all, "commissionRules"] as const,
    queryFn: () => apiClient.get<CommissionRule[]>("/sales/commission-rules"),
    staleTime: 2 * 60_000,
  });
}

export function useCreateCommissionRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; type: string; flatRate?: string; tiers?: Array<{ minValue: number; maxValue?: number; rate: number }>; appliesTo?: string }) =>
      apiClient.post("/sales/commission-rules", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.deals.all, "commissionRules"] }),
  });
}
