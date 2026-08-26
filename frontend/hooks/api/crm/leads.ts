"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useGatedQuery } from "@/hooks/api/gated-query";

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
    queryFn: () => apiClient.get<LeadSourceReport>("/leads/source-report"),
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
    queryFn: () => apiClient.get<{ groups: DuplicateGroup[]; total: number }>("/leads/duplicates"),
    staleTime: 2 * 60 * 1000,
  });
}

interface MergeLeadInput {
  keepLeadId: number;
  mergeLeadId: number;
}

export function useMergeLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["leads", "merge"] as const,
    mutationFn: ({ keepLeadId, mergeLeadId }: MergeLeadInput) =>
      apiClient.post<{ merged: boolean; winner: DuplicateLeadEntry }>("/leads/merge", {
        winnerId: keepLeadId,
        loserId: mergeLeadId,
        overrides: {},
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.leads.duplicates() });
      void qc.invalidateQueries({ queryKey: queryKeys.leads.all });
    },
  });
}
