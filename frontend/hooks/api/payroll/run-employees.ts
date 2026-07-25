"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { RunEmployee, RunEmployeeDetail, VarianceData } from "@/types/payroll/runs";

interface PaginatedRunEmployees {
  data: RunEmployee[];
  total: number;
  page: number;
  limit: number;
}

interface AdjustmentBody {
  type: "EARNING" | "DEDUCTION";
  name: string;
  amount: string;
  note: string;
}

export function useRunEmployees(
  runId: number,
  params?: { page?: number; limit?: number; search?: string; status?: string; workerType?: string },
) {
  return useQuery({
    queryKey: queryKeys.payroll.runEmployeesList(runId, params as Record<string, unknown> | undefined),
    queryFn: () =>
      apiClient.get<PaginatedRunEmployees>(
        `/payroll/runs/${runId}/employees`,
        params as Record<string, string | number> | undefined,
      ),
    staleTime: 30_000,
  });
}

export function useRunEmployee(runId: number, runEmployeeId: number) {
  return useQuery({
    queryKey: queryKeys.payroll.runEmployee(runId, runEmployeeId),
    queryFn: () =>
      apiClient.get<RunEmployeeDetail>(`/payroll/runs/${runId}/employees/${runEmployeeId}`),
    staleTime: 30_000,
    enabled: runId > 0 && runEmployeeId > 0,
  });
}

export function useRunVariance(runId: number) {
  return useQuery({
    queryKey: queryKeys.payroll.runVariance(runId),
    queryFn: () => apiClient.get<VarianceData>(`/payroll/runs/${runId}/variance`),
    staleTime: 60_000,
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
