"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { PayrollException, PayrollExceptionSeverity, PayrollExceptionStatus } from "@/types/payroll/runs";

export const runExceptionsKeys = {
  all: (runId: number) => ["payroll", "run-exceptions", runId] as const,
  list: (runId: number, params?: { severity?: string; status?: string }) =>
    ["payroll", "run-exceptions", runId, "list", params ?? {}] as const,
};

export function useRunExceptions(
  runId: number,
  params?: { severity?: PayrollExceptionSeverity; status?: PayrollExceptionStatus },
) {
  return useQuery({
    queryKey: runExceptionsKeys.list(runId, params),
    queryFn: () =>
      apiClient.get<PayrollException[]>(`/payroll/runs/${runId}/exceptions`, params),
    staleTime: 30_000,
  });
}

export function useResolveException(runId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["payroll", "run-exceptions", runId, "resolve"],
    mutationFn: ({ exceptionId, note }: { exceptionId: number; note?: string }) =>
      apiClient.patch<{ ok: boolean }>(
        `/payroll/runs/${runId}/exceptions/${exceptionId}/resolve`,
        { note },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: runExceptionsKeys.all(runId) });
      qc.invalidateQueries({ queryKey: ["payroll", "runs", runId] });
    },
  });
}

export function useOverrideException(runId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["payroll", "run-exceptions", runId, "override"],
    mutationFn: ({ exceptionId, reason }: { exceptionId: number; reason: string }) =>
      apiClient.patch<{ ok: boolean }>(
        `/payroll/runs/${runId}/exceptions/${exceptionId}/override`,
        { reason },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: runExceptionsKeys.all(runId) });
      qc.invalidateQueries({ queryKey: ["payroll", "runs", runId] });
    },
  });
}
