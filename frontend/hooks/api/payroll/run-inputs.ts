"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { RunInput } from "@/types/payroll/runs";

interface PatchInputBody {
  scheduledDays?: string;
  paidDays?: string;
  lopDays?: string;
  overtimeHours?: string;
  billableHours?: string;
  reason: string;
}

export function useRunInputs(runId: number, params?: { userId?: string }) {
  const canView = useCan("payroll:runs:view");
  return useQuery({
    queryKey: queryKeys.payroll.runInputs(runId, params as Record<string, unknown> | undefined),
    queryFn: ({ signal }) =>
      apiClient.get<RunInput[]>(`/payroll/runs/${runId}/inputs`, params, signal),
    staleTime: 30_000,
    enabled: canView && runId > 0,
  });
}

export function usePatchInput(runId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("payroll:runs:update", {
    mutationKey: ["payroll", "run-inputs", runId, "patch"],
    mutationFn: ({ inputId, body }: { inputId: number; body: PatchInputBody }) =>
      apiClient.patch<{ ok: boolean }>(`/payroll/runs/${runId}/inputs/${inputId}`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.runInputsAll(runId) });
    },
  });
}

export function useReimportInputs(runId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("payroll:runs:update", {
    mutationKey: ["payroll", "run-inputs", runId, "reimport"],
    mutationFn: () =>
      apiClient.post<{ ok: boolean; count: number }>(`/payroll/runs/${runId}/inputs/reimport`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.runInputsAll(runId) });
    },
  });
}
