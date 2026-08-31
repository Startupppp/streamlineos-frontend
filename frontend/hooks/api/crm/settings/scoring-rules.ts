"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useGatedQuery } from "@/hooks/api/gated-query";

export interface ScoringRule {
  id: number;
  orgId: string;
  field: string;
  operator: string;
  value: string;
  points: number;
  createdAt: string | null;
}

interface CreateScoringRuleInput {
  field: string;
  operator: string;
  value: string;
  points: number;
}

export interface UpdateScoringRuleInput {
  id: number;
  field?: string;
  operator?: string;
  value?: string;
  points?: number;
}

export function useScoringRules() {
  return useGatedQuery("crm:scoring-rules:manage", {
    queryKey: queryKeys.crmSettings.scoringRules(),
    queryFn: () => apiClient.get<ScoringRule[]>("/crm/scoring-rules"),
    staleTime: 2 * 60_000,
  });
}

export function useCreateScoringRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crm-settings", "scoring-rules", "create"],
    mutationFn: (input: CreateScoringRuleInput) =>
      apiClient.post<ScoringRule>("/crm/scoring-rules", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmSettings.scoringRules() });
    },
  });
}

export function useUpdateScoringRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crm-settings", "scoring-rules", "update"],
    mutationFn: ({ id, ...data }: UpdateScoringRuleInput) =>
      apiClient.patch<ScoringRule>(`/crm/scoring-rules/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmSettings.scoringRules() });
    },
  });
}

export function useDeleteScoringRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crm-settings", "scoring-rules", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/crm/scoring-rules/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmSettings.scoringRules() });
    },
  });
}
