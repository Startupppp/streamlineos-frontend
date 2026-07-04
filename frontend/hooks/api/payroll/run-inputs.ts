"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { RunInput } from "@/types/payroll/runs";

export const runInputsKeys = {
  all: (runId: number) => ["payroll", "run-inputs", runId] as const,
  list: (runId: number, params?: Record<string, string>) =>
    ["payroll", "run-inputs", runId, "list", params ?? {}] as const,
};

interface PatchInputBody {
  scheduledDays?: string;
  paidDays?: string;
  lopDays?: string;
  overtimeHours?: string;
  reason: string;
}

export function useRunInputs(runId: number, params?: { userId?: string }) {
  return useQuery({
    queryKey: runInputsKeys.list(runId, params as Record<string, string> | undefined),
    queryFn: () =>
      apiClient.get<RunInput[]>(`/payroll/runs/${runId}/inputs`, params),
    staleTime: 30_000,
  });
}

export function usePatchInput(runId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["payroll", "run-inputs", runId, "patch"],
    mutationFn: ({ inputId, body }: { inputId: number; body: PatchInputBody }) =>
      apiClient.patch<{ ok: boolean }>(`/payroll/runs/${runId}/inputs/${inputId}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: runInputsKeys.all(runId) });
    },
  });
}

export function useReimportInputs(runId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["payroll", "run-inputs", runId, "reimport"],
    mutationFn: () =>
      apiClient.post<{ ok: boolean; count: number }>(`/payroll/runs/${runId}/inputs/reimport`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: runInputsKeys.all(runId) });
    },
  });
}
