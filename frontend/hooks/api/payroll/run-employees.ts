"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { RunEmployee, RunEmployeeDetail, VarianceData } from "@/types/payroll/runs";

interface RunEmployeesPage {
  data: RunEmployee[];
  pagination: { limit: number; nextCursor: string | null; hasMore: boolean };
}

interface AdjustmentBody {
  type: "EARNING" | "DEDUCTION";
  name: string;
  amount: string;
  note: string;
}

export function useRunEmployees(
  runId: number,
  params?: { cursor?: string; limit?: number; search?: string; status?: string; workerType?: string },
) {
  const canView = useCan("payroll:runs:view");
  return useQuery({
    queryKey: queryKeys.payroll.runEmployeesList(runId, params as Record<string, unknown> | undefined),
    queryFn: () =>
      apiClient.get<RunEmployeesPage>(
        `/payroll/runs/${runId}/employees`,
        params as Record<string, string | number> | undefined,
      ),
    staleTime: 30_000,
    enabled: canView && runId > 0,
  });
}

export function useRunEmployee(runId: number, runEmployeeId: number) {
  const canView = useCan("payroll:runs:view");
  return useQuery({
    queryKey: queryKeys.payroll.runEmployee(runId, runEmployeeId),
    queryFn: () =>
      apiClient.get<RunEmployeeDetail>(`/payroll/runs/${runId}/employees/${runEmployeeId}`),
    staleTime: 30_000,
    enabled: canView && runId > 0 && runEmployeeId > 0,
  });
}

export function useRunVariance(runId: number) {
  const canView = useCan("payroll:runs:view");
  return useQuery({
    queryKey: queryKeys.payroll.runVariance(runId),
    queryFn: () => apiClient.get<VarianceData>(`/payroll/runs/${runId}/variance`),
    staleTime: 60_000,
    enabled: canView && runId > 0,
  });
}

export function useAddAdjustment(runId: number, runEmployeeId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["payroll", "run-employees", runId, runEmployeeId, "adjustment"],
    mutationFn: (body: AdjustmentBody) =>
      apiClient.post<{ ok: boolean }>(`/payroll/runs/${runId}/employees/${runEmployeeId}/adjustments`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.runEmployee(runId, runEmployeeId) });
    },
  });
}

export function useSetEmployeeHold(runId: number, runEmployeeId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["payroll", "run-employees", runId, runEmployeeId, "hold"],
    mutationFn: (body: { hold: boolean; reason?: string }) =>
      apiClient.post<{ ok: boolean }>(`/payroll/runs/${runId}/employees/${runEmployeeId}/hold`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.runEmployeesAll(runId) });
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.run(runId) });
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.runExceptionsAll(runId) });
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.commandCenterAll });
    },
  });
}
