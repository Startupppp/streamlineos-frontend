"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { payrollQueryKeys } from "@/lib/query-keys/payroll";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { RunEmployee, RunEmployeeDetail, VarianceData } from "@/types/payroll/runs";

interface RunEmployeesPage {
  data: RunEmployee[];
  pagination: { limit: number; nextCursor: string | null; hasMore: boolean };
}

const runListEmployeesC = lazyContract(() =>
  import("@/hooks/api/payroll/run-employees-schema").then((m) => m.runListEmployeesResponseContract),
);
const runEmployeeDetailC = lazyContract(() =>
  import("@/hooks/api/payroll/run-employees-schema").then((m) => m.runEmployeeDetailContract),
);
const runVarianceC = lazyContract(() =>
  import("@/hooks/api/payroll/run-employees-schema").then((m) => m.runVarianceResponseContract),
);
const addAdjustmentC = lazyContract(() =>
  import("@/hooks/api/payroll/run-employees-schema").then((m) => m.addAdjustmentResponseContract),
);

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
    queryKey: payrollQueryKeys.payroll.runEmployeesList(runId, params),
    queryFn: ({ signal }) =>
      apiClient.get(
        `/payroll/runs/${runId}/employees`,
        params, signal, runListEmployeesC,
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
      apiClient.get(`/payroll/runs/${runId}/employees/${runEmployeeId}`, undefined, signal, runEmployeeDetailC),
    staleTime: 30_000,
    enabled: canView && runId > 0 && runEmployeeId > 0,
  });
}

export function useRunVariance(runId: number) {
  const canView = useCan("payroll:runs:view");
  return useQuery({
    queryKey: payrollQueryKeys.payroll.runVariance(runId),
    queryFn: ({ signal }) => apiClient.get<VarianceData>(`/payroll/runs/${runId}/variance`, undefined, signal, runVarianceC),
    staleTime: 60_000,
    enabled: canView && runId > 0,
  });
}

export function useAddAdjustment(runId: number, runEmployeeId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("payroll:runs:manage", {
    mutationKey: ["payroll", "run-employees", runId, runEmployeeId, "adjustment"],
    mutationFn: (body: AdjustmentBody) =>
      apiClient.post<{ ok: boolean }>(`/payroll/runs/${runId}/employees/${runEmployeeId}/adjustments`, body, undefined, addAdjustmentC),
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
      apiClient.post<{ ok: boolean }>(`/payroll/runs/${runId}/employees/${runEmployeeId}/hold`, body, undefined, addAdjustmentC),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.runEmployeesAll(runId) });
      void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.run(runId) });
      void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.runExceptionsAll(runId) });
      void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.commandCenterAll });
    },
  });
}
