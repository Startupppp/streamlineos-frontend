"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { payrollQueryKeys } from "@/lib/query-keys/payroll";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import {
  payrollRunDetailContract,
  payrollRunsPageContract,
  type PayrollRunDetail as RunDetail,
  type PayrollRunsPage as RunsPage,
} from "@/hooks/api/payroll/runs-schema";

export function usePayrollRuns(params?: {
  cursor?: string;
  limit?: number;
  entityId?: number;
}) {
  const canView = useCan("payroll:runs:view");
  return useQuery<RunsPage, Error>({
    queryKey: payrollQueryKeys.payroll.runs(params as Record<string, unknown> | undefined),
    queryFn: ({ signal }) =>
      apiClient.get("/payroll/runs", params as Record<string, string | number> | undefined, signal, payrollRunsPageContract),
    staleTime: 60_000,
    enabled: canView,
  });
}

export function usePayrollRun(runId: number) {
  const canView = useCan("payroll:runs:view");
  return useQuery<RunDetail, Error>({
    queryKey: payrollQueryKeys.payroll.run(runId),
    queryFn: ({ signal }) => apiClient.get(`/payroll/runs/${runId}`, undefined, signal, payrollRunDetailContract),
    staleTime: 30_000,
    enabled: canView && runId > 0,
  });
}

export type PayrollRunType =
  | "REGULAR"
  | "BONUS"
  | "OFF_CYCLE"
  | "CORRECTION"
  | "FINAL_SETTLEMENT";

export interface CreateRunInput {
  month: string;
  runType?: PayrollRunType;
  /** Required for OFF_CYCLE, CORRECTION, and FINAL_SETTLEMENT — links to the source regular run. */
  sourceRunId?: number;
  /** Legal entity — scopes period ensure + statutory pack. */
  entityId?: number;
}

export function useCreateRun() {
  const qc = useQueryClient();
  return useAuthorizedMutation("payroll:runs:create", {
    mutationKey: ["payroll", "runs", "create"],
    mutationFn: (input: string | CreateRunInput) => {
      const body: CreateRunInput =
        typeof input === "string" ? { month: input } : input;
      return apiClient.post<{ runId: number }>("/payroll/runs", body);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...payrollQueryKeys.payroll.all, "runs"] });
      void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.commandCenterAll });
    },
  });
}

export function useGenerateRun() {
  const qc = useQueryClient();
  return useAuthorizedMutation("payroll:runs:manage", {
    mutationKey: ["payroll", "runs", "generate"],
    mutationFn: (runId: number) =>
      apiClient.post<{ ok: boolean }>(`/payroll/runs/${runId}/generate`),
    onSuccess: (_, runId) => {
      void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.run(runId) });
      void qc.invalidateQueries({ queryKey: [...payrollQueryKeys.payroll.all, "runs"] });
      void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.runEmployeesAll(runId) });
      void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.runExceptionsAll(runId) });
      void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.runVariance(runId) });
      void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.commandCenterAll });
    },
  });
}

export function useRecalculateRun() {
  const qc = useQueryClient();
  return useAuthorizedMutation("payroll:runs:manage", {
    mutationKey: ["payroll", "runs", "recalculate"],
    mutationFn: (runId: number) =>
      apiClient.post<{ ok: boolean }>(`/payroll/runs/${runId}/recalculate`),
    onSuccess: (_, runId) => {
      void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.run(runId) });
      void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.runEmployeesAll(runId) });
      void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.runExceptionsAll(runId) });
      void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.runVariance(runId) });
      void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.commandCenterAll });
    },
  });
}
