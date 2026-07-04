"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { PayrollRun, PayrollRunListItem, PayrollChecklistItem } from "@/types/payroll/runs";

export const runsKeys = {
  all: ["payroll", "runs"] as const,
  list: (params?: Record<string, string | number>) =>
    ["payroll", "runs", "list", params ?? {}] as const,
  detail: (runId: number) => ["payroll", "runs", runId] as const,
};

interface PaginatedRuns {
  data: PayrollRunListItem[];
  total: number;
  page: number;
  limit: number;
}

interface RunDetail {
  run: PayrollRun;
  checklist: PayrollChecklistItem[];
}

export function usePayrollRuns(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: runsKeys.list(params),
    queryFn: () =>
      apiClient.get<PaginatedRuns>("/payroll/runs", params as Record<string, string | number> | undefined),
    staleTime: 60_000,
  });
}

export function usePayrollRun(runId: number) {
  return useQuery({
    queryKey: runsKeys.detail(runId),
    queryFn: () => apiClient.get<RunDetail>(`/payroll/runs/${runId}`),
    staleTime: 30_000,
  });
}

export function useCreateRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["payroll", "runs", "create"],
    mutationFn: (month: string) =>
      apiClient.post<{ runId: number }>("/payroll/runs", { month }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: runsKeys.all });
    },
  });
}

export function useGenerateRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["payroll", "runs", "generate"],
    mutationFn: (runId: number) =>
      apiClient.post<{ ok: boolean }>(`/payroll/runs/${runId}/generate`),
    onSuccess: (_data, runId) => {
      qc.invalidateQueries({ queryKey: runsKeys.detail(runId) });
      qc.invalidateQueries({ queryKey: runsKeys.list() });
    },
  });
}

export function useRecalculateRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["payroll", "runs", "recalculate"],
    mutationFn: (runId: number) =>
      apiClient.post<{ ok: boolean }>(`/payroll/runs/${runId}/recalculate`),
    onSuccess: (_data, runId) => {
      qc.invalidateQueries({ queryKey: runsKeys.detail(runId) });
      qc.invalidateQueries({ queryKey: ["payroll", "run-employees", runId] });
      qc.invalidateQueries({ queryKey: ["payroll", "run-exceptions", runId] });
    },
  });
}
