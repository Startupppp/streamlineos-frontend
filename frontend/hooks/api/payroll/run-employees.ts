"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { RunEmployee, RunEmployeeDetail } from "@/types/payroll/runs";

export const runEmployeesKeys = {
  all: (runId: number) => ["payroll", "run-employees", runId] as const,
  list: (runId: number, params?: Record<string, string | number>) =>
    ["payroll", "run-employees", runId, "list", params ?? {}] as const,
  detail: (runId: number, runEmployeeId: number) =>
    ["payroll", "run-employees", runId, runEmployeeId] as const,
};

interface PaginatedRunEmployees {
  data: RunEmployee[];
  total: number;
  page: number;
  limit: number;
}

interface PatchInputBody {
  scheduledDays?: string;
  paidDays?: string;
  lopDays?: string;
  overtimeHours?: string;
  reason: string;
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
    queryKey: runEmployeesKeys.list(runId, params as Record<string, string | number> | undefined),
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
    queryKey: runEmployeesKeys.detail(runId, runEmployeeId),
    queryFn: () =>
      apiClient.get<RunEmployeeDetail>(`/payroll/runs/${runId}/employees/${runEmployeeId}`),
    staleTime: 30_000,
  });
}

export function useRunVariance(runId: number) {
  return useQuery({
    queryKey: ["payroll", "run-variance", runId],
    queryFn: () => apiClient.get<{ currentRun: { id: number; month: string; grossTotal: string | null; netTotal: string | null }; previousRun: { id: number; month: string; grossTotal: string | null; netTotal: string | null } | null; topMovers: { userId: string; net: string | null; userName: string }[] }>(`/payroll/runs/${runId}/variance`),
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
      qc.invalidateQueries({ queryKey: runEmployeesKeys.detail(runId, runEmployeeId) });
    },
  });
}
