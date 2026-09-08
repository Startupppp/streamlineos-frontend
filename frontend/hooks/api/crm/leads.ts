"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { lazyContract } from "@/lib/api-envelope";

const leadsSourceReportContract = lazyContract(() =>
  import("@/hooks/api/crm/leads-schema").then((m) => m.leadsSourceReportContract),
);
const leadsDuplicateGroupsContract = lazyContract(() =>
  import("@/hooks/api/crm/leads-schema").then((m) => m.leadsDuplicateGroupsContract),
);
const leadsMergeContract = lazyContract(() =>
  import("@/hooks/api/crm/leads-schema").then((m) => m.leadsMergeContract),
);

interface LeadSourceStat {
  source: string;
  count: number;
  converted: number;
  conversionRate: number;
  totalValue: number;
}

interface LeadSourceReport {
  sources: LeadSourceStat[];
  total: number;
}

export function useLeadSourceReport() {
  return useGatedQuery("crm:leads:view", {
    queryKey: queryKeys.leads.sourceReport(),
    queryFn: ({ signal }) => apiClient.get<LeadSourceReport>("/leads/source-report", undefined, signal, leadsSourceReportContract),
    staleTime: 2 * 60_000,
  });
}

interface DuplicateLeadEntry {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: string;
  source: string | null;
  createdAt: string | null;
}

export interface DuplicateGroup {
  leads: DuplicateLeadEntry[];
  matchReason: string[];
  score: number;
}

export function useDuplicateLeads() {
  return useGatedQuery("crm:leads:view", {
    queryKey: queryKeys.leads.duplicates(),
    queryFn: ({ signal }) => apiClient.get<{ groups: DuplicateGroup[]; total: number }>("/leads/duplicates", undefined, signal, leadsDuplicateGroupsContract),
    staleTime: 2 * 60 * 1000,
  });
}

interface MergeLeadInput {
  keepLeadId: number;
  mergeLeadId: number;
}

export function useMergeLead() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:leads:assign", {
    mutationKey: ["leads", "merge"] as const,
    mutationFn: ({ keepLeadId, mergeLeadId }: MergeLeadInput) =>
      apiClient.post<{ merged: boolean; winner: DuplicateLeadEntry }>("/leads/merge", {
        winnerId: keepLeadId,
        loserId: mergeLeadId,
        overrides: {},
      }, undefined, leadsMergeContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.leads.duplicates() });
      void qc.invalidateQueries({ queryKey: queryKeys.leads.all });
    },
  });
}
