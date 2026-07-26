"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { PayrollException, PayrollExceptionSeverity, PayrollExceptionStatus } from "@/types/payroll/runs";

export function useRunExceptions(
  runId: number,
  params?: { severity?: PayrollExceptionSeverity; status?: PayrollExceptionStatus },
) {
  const canView = useCan("payroll:runs:view");
  return useQuery({
    queryKey: queryKeys.payroll.runExceptions(runId, params as Record<string, unknown> | undefined),
    queryFn: () =>
      apiClient.get<PayrollException[]>(`/payroll/runs/${runId}/exceptions`, params),
    staleTime: 30_000,
    enabled: canView && runId > 0,
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
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.runExceptionsAll(runId) });
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.run(runId) });
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.commandCenterAll });
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
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.runExceptionsAll(runId) });
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.run(runId) });
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.commandCenterAll });
    },
  });
}
