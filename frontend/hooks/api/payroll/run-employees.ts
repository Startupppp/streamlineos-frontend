"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { payrollQueryKeys } from "@/lib/query-keys/payroll";
import { useCan } from "@/hooks/api/access";
import type { RunEmployee, RunEmployeeDetail, VarianceData } from "@/types/payroll/runs";

interface RunEmployeesPage {
  data: RunEmployee[];
  pagination: { limit: number; nextCursor: string | null; hasMore: boolean };
}
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

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
  return useQuery<RunEmployeesPage, Error>({
    queryKey: payrollQueryKeys.payroll.runEmployeesList(runId, params as Record<string, unknown> | undefined),
    queryFn: ({ signal }) =>
      apiClient.get<RunEmployeesPage>(
        `/payroll/runs/${runId}/employees`,
        params as Record<string, string | number> | undefined, signal,
      ),
    staleTime: 30_000,
    enabled: canView && runId > 0,
  });
}

export function useRunEmployee(runId: number, runEmployeeId: number) {
  const canView = useCan("payroll:runs:view");
  return useQuery({
    queryKey: payrollQueryKeys.payroll.runEmployee(runId, runEmployeeId),
    queryFn: ({ signal }) =>
      apiClient.get<RunEmployeeDetail>(`/payroll/runs/${runId}/employees/${runEmployeeId}`, undefined, signal),
    staleTime: 30_000,
    enabled: canView && runId > 0 && runEmployeeId > 0,
  });
}

export function useRunVariance(runId: number) {
  const canView = useCan("payroll:runs:view");
  return useQuery({
    queryKey: payrollQueryKeys.payroll.runVariance(runId),
    queryFn: ({ signal }) => apiClient.get<VarianceData>(`/payroll/runs/${runId}/variance`, undefined, signal),
    staleTime: 60_000,
    enabled: canView && runId > 0,
  });
}

export function useAddAdjustment(runId: number, runEmployeeId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("payroll:runs:manage", {
    mutationKey: ["payroll", "run-employees", runId, runEmployeeId, "adjustment"],
    mutationFn: (body: AdjustmentBody) =>
      apiClient.post<{ ok: boolean }>(`/payroll/runs/${runId}/employees/${runEmployeeId}/adjustments`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.runEmployee(runId, runEmployeeId) });
    },
  });
}

export function useSetEmployeeHold(runId: number, runEmployeeId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("payroll:runs:manage", {
    mutationKey: ["payroll", "run-employees", runId, runEmployeeId, "hold"],
    mutationFn: (body: { hold: boolean; reason?: string }) =>
      apiClient.post<{ ok: boolean }>(`/payroll/runs/${runId}/employees/${runEmployeeId}/hold`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.runEmployeesAll(runId) });
      void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.run(runId) });
      void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.runExceptionsAll(runId) });
      void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.commandCenterAll });
    },
  });
}
