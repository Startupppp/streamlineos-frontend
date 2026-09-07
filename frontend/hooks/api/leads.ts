"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { accessAndCrmQueryKeys } from "@/lib/query-keys/access-and-crm";
import { customerWorkQueryKeys } from "@/lib/query-keys/customer-work";
import type {
  PaginatedLeads,
  Lead,
  LeadWithActivities,
  LeadActivity,
  TimelineItem,
  LeadStats,
  LeadBoard,
  SlaAlertResponse,
  LeadAnalyticsSummary,
  SalesLeaderboardEntry,
  SalesTeamCapacityEntry,
  LeadFilters,
  CreateLeadInput,
  UpdateLeadInput,
  UpdateLeadStatusInput,
  AssignLeadInput,
  LogActivityInput,
  BulkUpdateLeadsInput,
  BulkDeleteLeadsInput,
  DistributeLeadsInput,
  DistributeResult,
} from "@/types/leads";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { lazyContract } from "@/lib/api-envelope";

const leadListLazy = lazyContract(() => import("@/hooks/api/leads-schema").then((m) => m.leadListContract));
const leadPartyLazy = lazyContract(() => import("@/hooks/api/leads-schema").then((m) => m.leadPartyContract));
const leadDetailLazy = lazyContract(() => import("@/hooks/api/leads-schema").then((m) => m.leadDetailContract));
const leadBoardLazy = lazyContract(() => import("@/hooks/api/leads-schema").then((m) => m.leadBoardContract));
const leadStatsLazy = lazyContract(() => import("@/hooks/api/leads-schema").then((m) => m.leadStatsContract));
const leadTimelineLazy = lazyContract(() => import("@/hooks/api/leads-schema").then((m) => m.leadTimelineContract));
const leadsSlaAlertsLazy = lazyContract(() => import("@/hooks/api/leads-schema").then((m) => m.leadsSlaAlertsContract));
const leadsAnalyticsLazy = lazyContract(() => import("@/hooks/api/leads-schema").then((m) => m.leadsAnalyticsContract));
const leadActivityLazy = lazyContract(() => import("@/hooks/api/leads-schema").then((m) => m.leadActivityContract));
const leadsBulkUpdateLazy = lazyContract(() => import("@/hooks/api/leads-schema").then((m) => m.leadsBulkUpdateContract));
const leadsBulkDeleteLazy = lazyContract(() => import("@/hooks/api/leads-schema").then((m) => m.leadsBulkDeleteContract));
const leadsDistributeLazy = lazyContract(() => import("@/hooks/api/leads-schema").then((m) => m.leadsDistributeContract));
const leadScoreExplanationLazy = lazyContract(() => import("@/hooks/api/leads-schema").then((m) => m.leadScoreExplanationContract));
const leadsCheckDuplicatesLazy = lazyContract(() => import("@/hooks/api/leads-schema").then((m) => m.leadsCheckDuplicatesContract));
const leadsSalesLeaderboardLazy = lazyContract(() => import("@/hooks/api/leads-schema").then((m) => m.leadsSalesLeaderboardContract));
const leadsSalesTeamCapacityLazy = lazyContract(() => import("@/hooks/api/leads-schema").then((m) => m.leadsSalesTeamCapacityContract));


export function useLeads(filters?: LeadFilters, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: customerWorkQueryKeys.leads.list(filters as Record<string, unknown>),
    queryFn: ({ signal }) =>
      apiClient.get<PaginatedLeads>("/leads", filters as Record<string, unknown>, signal, leadListLazy),
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
    ...(options?.enabled !== undefined ? { enabled: options.enabled } : {}),
  });
}

export function useLeadDetail(id: number) {
  return useQuery({
    queryKey: customerWorkQueryKeys.leads.detail(id),
    queryFn: ({ signal }) => apiClient.get<LeadWithActivities>(`/leads/${id}`, undefined, signal, leadDetailLazy),
    staleTime: 2 * 60_000,
    enabled: id > 0,
  });
}

export function useLeadBoard() {
  return useQuery({
    queryKey: customerWorkQueryKeys.leads.board(),
    queryFn: ({ signal }) => apiClient.get<LeadBoard>("/leads/board", undefined, signal, leadBoardLazy),
    staleTime: 2 * 60_000,
  });
}

export function useLeadStats(filters?: { dateFrom?: string; dateTo?: string }) {
  return useQuery({
    queryKey: customerWorkQueryKeys.leads.stats(filters),
    queryFn: ({ signal }) =>
      apiClient.get<LeadStats>("/leads/stats", filters as Record<string, unknown>, signal, leadStatsLazy),
    staleTime: 2 * 60_000,
  });
}

export function useLeadTimeline(leadId: number, limit?: number) {
  return useQuery({
    queryKey: customerWorkQueryKeys.leads.timeline(leadId),
    queryFn: ({ signal }) =>
      apiClient.get<TimelineItem[]>(`/leads/${leadId}/timeline`, limit ? { limit } : undefined, signal, leadTimelineLazy),
    staleTime: 2 * 60_000,
    enabled: leadId > 0,
  });
}

export function useLeadSlaAlerts() {
  return useQuery({
    queryKey: customerWorkQueryKeys.leads.slaAlerts(),
    queryFn: ({ signal }) => apiClient.get<SlaAlertResponse>("/leads/sla-alerts", undefined, signal, leadsSlaAlertsLazy),
    staleTime: 2 * 60_000,
  });
}

export function useLeadAnalyticsSummary(filters?: {
  dateFrom?: string;
  dateTo?: string;
}) {
  return useQuery({
    queryKey: customerWorkQueryKeys.leads.analyticsSummary(filters),
    queryFn: ({ signal }) =>
      apiClient.get<LeadAnalyticsSummary>("/leads/analytics", filters as Record<string, unknown>, signal, leadsAnalyticsLazy),
    staleTime: 2 * 60_000,
  });
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:leads:create", {
    mutationKey: ["leads", "create"] as const,
    mutationFn: (input: CreateLeadInput) =>
      apiClient.post<Lead>("/leads", input, undefined, leadDetailLazy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerWorkQueryKeys.leads.all });
    },
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:leads:update", {
    mutationKey: ["leads", "update"] as const,
    mutationFn: ({ id, ...data }: UpdateLeadInput) =>
      apiClient.patch<Lead>(`/leads/${id}`, data, undefined, leadDetailLazy),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: customerWorkQueryKeys.leads.list() });
      const previousList = qc.getQueryData<PaginatedLeads>(customerWorkQueryKeys.leads.list());
      if (previousList) {
        qc.setQueryData<PaginatedLeads>(customerWorkQueryKeys.leads.list(), {
          ...previousList,
          leads: previousList.leads.map((l) =>
            l.id === vars.id ? { ...l, ...vars } : l,
          ),
        });
      }
      return { previousList };
    },
    onError: (_, _vars, ctx) => {
      if (ctx?.previousList) {
        qc.setQueryData(customerWorkQueryKeys.leads.list(), ctx.previousList);
      }
    },
    onSettled: (_, _err, vars) => {
      qc.invalidateQueries({ queryKey: customerWorkQueryKeys.leads.all });
      qc.invalidateQueries({ queryKey: customerWorkQueryKeys.leads.detail(vars.id) });
    },
  });
}

export function useUpdateLeadStatus() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:leads:update", {
    mutationKey: ["leads", "updateStatus"] as const,
    mutationFn: (input: UpdateLeadStatusInput) =>
      apiClient.patch<Lead>(`/leads/${input.leadId}/status`, input, undefined, leadDetailLazy),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: customerWorkQueryKeys.leads.board() });
      const previousBoard = qc.getQueryData<LeadBoard>(customerWorkQueryKeys.leads.board());
      if (previousBoard && vars.expectedStatus) {
        const from: string = vars.expectedStatus;
        const to: string = vars.status;
        const fromCol = previousBoard[from];
        const lead = fromCol?.leads.find((l) => l.id === vars.leadId);
        if (lead && fromCol) {
          const toCol = previousBoard[to];
          qc.setQueryData<LeadBoard>(customerWorkQueryKeys.leads.board(), {
            ...previousBoard,
            [from]: { leads: fromCol.leads.filter((l) => l.id !== vars.leadId), total: fromCol.total - 1 },
            [to]: { leads: [...(toCol?.leads ?? []), { ...lead, status: vars.status }], total: (toCol?.total ?? 0) + 1 },
          });
        }
      }
      return { previousBoard };
    },
    onError: (_, _vars, ctx) => {
      if (ctx?.previousBoard) {
        qc.setQueryData(customerWorkQueryKeys.leads.board(), ctx.previousBoard);
      }
    },
    onSettled: (_, _err, vars) => {
      qc.invalidateQueries({ queryKey: customerWorkQueryKeys.leads.board() });
      qc.invalidateQueries({ queryKey: customerWorkQueryKeys.leads.detail(vars.leadId) });
      qc.invalidateQueries({ queryKey: customerWorkQueryKeys.leads.all });
      if (vars.status === "CONVERTED") {
        qc.invalidateQueries({ queryKey: customerWorkQueryKeys.clients.all });
      }
    },
  });
}

export function useLogLeadActivity() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:leads:update", {
    mutationKey: ["leads", "activity", "log"] as const,
    mutationFn: (input: LogActivityInput) =>
      apiClient.post<LeadActivity>(`/leads/${input.leadId}/activities`, input, undefined, leadActivityLazy),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: customerWorkQueryKeys.leads.activities(vars.leadId) });
      qc.invalidateQueries({ queryKey: customerWorkQueryKeys.leads.detail(vars.leadId) });
      qc.invalidateQueries({ queryKey: customerWorkQueryKeys.leads.timeline(vars.leadId) });
    },
  });
}

export function useBulkUpdateLeads() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:leads:update", {
    mutationKey: ["leads", "bulkUpdate"] as const,
    mutationFn: (input: BulkUpdateLeadsInput) =>
      apiClient.patch<{ updated: number }>("/leads/bulk", input, undefined, leadsBulkUpdateLazy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerWorkQueryKeys.leads.all });
    },
  });
}

export function useBulkDeleteLeads() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:leads:delete", {
    mutationKey: ["leads", "bulkDelete"] as const,
    mutationFn: (input: BulkDeleteLeadsInput) =>
      apiClient.delete<{ deleted: number }>("/leads/bulk", input, undefined, leadsBulkDeleteLazy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerWorkQueryKeys.leads.all });
    },
  });
}

export function useDistributeLeads() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:leads:assign", {
    mutationKey: ["leads", "distribute"] as const,
    mutationFn: (input: DistributeLeadsInput) =>
      apiClient.post<DistributeResult>("/leads/distribute", input, undefined, leadsDistributeLazy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerWorkQueryKeys.leads.all });
    },
  });
}

export function useSelfAssignLead() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:leads:update", {
    mutationKey: ["leads", "selfAssign"] as const,
    mutationFn: (leadId: number) =>
      apiClient.patch<Lead>(`/leads/${leadId}/self-assign`, {}, undefined, leadDetailLazy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerWorkQueryKeys.leads.all });
    },
  });
}

export function useAssignLead() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:leads:assign", {
    mutationKey: ["leads", "assign"] as const,
    mutationFn: (input: AssignLeadInput) =>
      apiClient.patch<Lead>(`/leads/${input.leadId}/assign`, { assignedToId: input.assignedToId }, undefined, leadDetailLazy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerWorkQueryKeys.leads.all });
    },
  });
}

export function useSalesLeaderboard() {
  return useQuery({
    queryKey: accessAndCrmQueryKeys.salesLeaderboard.list(),
    queryFn: ({ signal }) =>
      apiClient.get<SalesLeaderboardEntry[]>("/leads/sales-leaderboard", undefined, signal, leadsAnalyticsLazy),
    staleTime: 2 * 60_000,
  });
}

export function useSalesTeamCapacity() {
  return useQuery({
    queryKey: accessAndCrmQueryKeys.salesTeamCapacity.list(),
    queryFn: ({ signal }) =>
      apiClient.get<SalesTeamCapacityEntry[]>("/leads/sales-team-capacity", undefined, signal, leadsAnalyticsLazy),
    staleTime: 2 * 60_000,
  });
}

interface DuplicateCheckResult {
  duplicates: Array<{
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    status: string;
    createdAt: string | null;
  }>;
}

export function useCheckLeadDuplicates(params: { email?: string; phone?: string }, options?: { enabled?: boolean }) {
  const hasParams = !!(params.email || params.phone);
  return useQuery({
    queryKey: [...customerWorkQueryKeys.leads.all, "duplicateCheck", params] as const,
    queryFn: ({ signal }) => apiClient.get<DuplicateCheckResult>("/leads/check-duplicates", params as Record<string, unknown>, signal, leadsDuplicateLazy),
    enabled: hasParams && (options?.enabled !== false),
    staleTime: 30_000,
  });
}

interface ScoreExplanation {
  score: number;
  totalRules: number;
  firedRules: { name: string; field: string; operator: string; value: string; points: number }[];
}

export function useLeadScoreExplanation(leadId: number, enabled: boolean) {
  return useQuery({
    queryKey: [...customerWorkQueryKeys.leads.all, "scoreExplanation", leadId] as const,
    queryFn: ({ signal }) => apiClient.get<ScoreExplanation>(`/leads/${leadId}/score-explanation`, undefined, signal, leadScoreExplanationLazy),
    enabled,
    staleTime: 60_000,
  });
}
