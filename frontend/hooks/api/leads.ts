"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
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
  BulkImportLeadsInput,
  BulkImportResult,
  DistributeLeadsInput,
  DistributeResult,
} from "@/types/leads";

export function useLeads(filters?: LeadFilters, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.leads.list(filters as Record<string, unknown>),
    queryFn: () =>
      apiClient.get<PaginatedLeads>("/leads", filters as Record<string, unknown>),
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
    ...(options?.enabled !== undefined ? { enabled: options.enabled } : {}),
  });
}

export function useLeadDetail(id: number) {
  return useQuery({
    queryKey: queryKeys.leads.detail(id),
    queryFn: () => apiClient.get<LeadWithActivities>(`/leads/${id}`),
    staleTime: 2 * 60_000,
    enabled: id > 0,
  });
}

export function useLeadBoard() {
  return useQuery({
    queryKey: queryKeys.leads.board(),
    queryFn: () => apiClient.get<LeadBoard>("/leads/board"),
    staleTime: 2 * 60_000,
  });
}

export function useLeadStats(filters?: { dateFrom?: string; dateTo?: string }) {
  return useQuery({
    queryKey: queryKeys.leads.stats(filters),
    queryFn: () =>
      apiClient.get<LeadStats>("/leads/stats", filters as Record<string, unknown>),
    staleTime: 2 * 60_000,
  });
}

export function useLeadTimeline(leadId: number, limit?: number) {
  return useQuery({
    queryKey: queryKeys.leads.timeline(leadId),
    queryFn: () =>
      apiClient.get<TimelineItem[]>(`/leads/${leadId}/timeline`, limit ? { limit } : undefined),
    staleTime: 2 * 60_000,
    enabled: leadId > 0,
  });
}

export function useLeadSlaAlerts() {
  return useQuery({
    queryKey: queryKeys.leads.slaAlerts(),
    queryFn: () => apiClient.get<SlaAlertResponse>("/leads/sla-alerts"),
    staleTime: 2 * 60_000,
  });
}

export function useLeadAnalyticsSummary(filters?: {
  dateFrom?: string;
  dateTo?: string;
}) {
  return useQuery({
    queryKey: queryKeys.leads.analyticsSummary(filters),
    queryFn: () =>
      apiClient.get<LeadAnalyticsSummary>("/leads/analytics", filters as Record<string, unknown>),
    staleTime: 2 * 60_000,
  });
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["leads", "create"] as const,
    mutationFn: (input: CreateLeadInput) =>
      apiClient.post<Lead>("/leads", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.leads.all });
    },
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["leads", "update"] as const,
    mutationFn: ({ id, ...data }: UpdateLeadInput) =>
      apiClient.patch<Lead>(`/leads/${id}`, data),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: queryKeys.leads.list() });
      const previousList = qc.getQueryData<PaginatedLeads>(queryKeys.leads.list());
      if (previousList) {
        qc.setQueryData<PaginatedLeads>(queryKeys.leads.list(), {
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
        qc.setQueryData(queryKeys.leads.list(), ctx.previousList);
      }
    },
    onSettled: (_, _err, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.leads.all });
      qc.invalidateQueries({ queryKey: queryKeys.leads.detail(vars.id) });
    },
  });
}

export function useUpdateLeadStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["leads", "updateStatus"] as const,
    mutationFn: (input: UpdateLeadStatusInput) =>
      apiClient.patch<Lead>(`/leads/${input.leadId}/status`, input),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: queryKeys.leads.board() });
      const previousBoard = qc.getQueryData<LeadBoard>(queryKeys.leads.board());
      if (previousBoard && vars.expectedStatus) {
        const from = vars.expectedStatus as keyof LeadBoard;
        const to = vars.status as keyof LeadBoard;
        const fromCol = previousBoard[from];
        const lead = fromCol?.leads.find((l) => l.id === vars.leadId);
        if (lead && fromCol) {
          const toCol = previousBoard[to];
          qc.setQueryData<LeadBoard>(queryKeys.leads.board(), {
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
        qc.setQueryData(queryKeys.leads.board(), ctx.previousBoard);
      }
    },
    onSettled: (_, _err, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.leads.board() });
      qc.invalidateQueries({ queryKey: queryKeys.leads.detail(vars.leadId) });
      qc.invalidateQueries({ queryKey: queryKeys.leads.all });
      if (vars.status === "CONVERTED") {
        qc.invalidateQueries({ queryKey: queryKeys.clients.all });
      }
    },
  });
}

export function useLogLeadActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["leads", "activity", "log"] as const,
    mutationFn: (input: LogActivityInput) =>
      apiClient.post<LeadActivity>(`/leads/${input.leadId}/activities`, input),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.leads.activities(vars.leadId) });
      qc.invalidateQueries({ queryKey: queryKeys.leads.detail(vars.leadId) });
      qc.invalidateQueries({ queryKey: queryKeys.leads.timeline(vars.leadId) });
    },
  });
}

export function useBulkUpdateLeads() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["leads", "bulkUpdate"] as const,
    mutationFn: (input: BulkUpdateLeadsInput) =>
      apiClient.patch<{ updated: number }>("/leads/bulk", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.leads.all });
    },
  });
}

export function useBulkDeleteLeads() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["leads", "bulkDelete"] as const,
    mutationFn: (input: BulkDeleteLeadsInput) =>
      apiClient.delete<{ deleted: number }>("/leads/bulk", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.leads.all });
    },
  });
}

export function useBulkImportLeads() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["leads", "import"] as const,
    mutationFn: (input: BulkImportLeadsInput) =>
      apiClient.post<BulkImportResult>("/leads/import", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.leads.all });
    },
  });
}

export function useDistributeLeads() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["leads", "distribute"] as const,
    mutationFn: (input: DistributeLeadsInput) =>
      apiClient.post<DistributeResult>("/leads/distribute", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.leads.all });
    },
  });
}

export function useSelfAssignLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["leads", "selfAssign"] as const,
    mutationFn: (leadId: number) =>
      apiClient.patch<Lead>(`/leads/${leadId}/self-assign`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.leads.all });
    },
  });
}

export function useAssignLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["leads", "assign"] as const,
    mutationFn: (input: AssignLeadInput) =>
      apiClient.patch<Lead>(`/leads/${input.leadId}/assign`, { assignedToId: input.assignedToId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.leads.all });
    },
  });
}

export function useSalesLeaderboard() {
  return useQuery({
    queryKey: queryKeys.salesLeaderboard.list(),
    queryFn: () =>
      apiClient.get<SalesLeaderboardEntry[]>("/leads/sales-leaderboard"),
    staleTime: 2 * 60_000,
  });
}

export function useSalesTeamCapacity() {
  return useQuery({
    queryKey: queryKeys.salesTeamCapacity.list(),
    queryFn: () =>
      apiClient.get<SalesTeamCapacityEntry[]>("/leads/sales-team-capacity"),
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
    queryKey: [...queryKeys.leads.all, "duplicateCheck", params] as const,
    queryFn: () => apiClient.get<DuplicateCheckResult>("/leads/check-duplicates", params as Record<string, unknown>),
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
    queryKey: [...queryKeys.leads.all, "scoreExplanation", leadId] as const,
    queryFn: () => apiClient.get<ScoreExplanation>(`/leads/${leadId}/score-explanation`),
    enabled,
    staleTime: 60_000,
  });
}
