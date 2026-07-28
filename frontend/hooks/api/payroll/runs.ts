"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { PayrollRun, PayrollRunListItem, PayrollChecklistItem } from "@/types/payroll/runs";

interface PaginatedRuns {
  data: PayrollRunListItem[];
  total: number;
  page: number;
  limit: number;
}

interface RunDetail {
  run: PayrollRun;
  checklist: PayrollChecklistItem[];
  payoutHealth: { failedCount: number; heldCount: number } | null;
}

export function usePayrollRuns(params?: {
  page?: number;
  limit?: number;
  entityId?: number;
}) {
  const canView = useCan("payroll:runs:view");
  return useQuery({
    queryKey: queryKeys.payroll.runs(params as Record<string, unknown> | undefined),
    queryFn: () =>
      apiClient.get<PaginatedRuns>("/payroll/runs", params as Record<string, string | number> | undefined),
    staleTime: 60_000,
    enabled: canView,
  });
}

export function usePayrollRun(runId: number) {
  const canView = useCan("payroll:runs:view");
  return useQuery({
    queryKey: queryKeys.payroll.run(runId),
    queryFn: () => apiClient.get<RunDetail>(`/payroll/runs/${runId}`),
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
  return useMutation({
    mutationKey: ["payroll", "runs", "create"],
    mutationFn: (input: string | CreateRunInput) => {
      const body: CreateRunInput =
        typeof input === "string" ? { month: input } : input;
      return apiClient.post<{ runId: number }>("/payroll/runs", body);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...queryKeys.payroll.all, "runs"] });
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.commandCenterAll });
    },
  });
}

export function useGenerateRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["payroll", "runs", "generate"],
    mutationFn: (runId: number) =>
      apiClient.post<{ ok: boolean }>(`/payroll/runs/${runId}/generate`),
    onSuccess: (_, runId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.run(runId) });
      void qc.invalidateQueries({ queryKey: [...queryKeys.payroll.all, "runs"] });
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.commandCenterAll });
    },
  });
}

export function useRecalculateRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["payroll", "runs", "recalculate"],
    mutationFn: (runId: number) =>
      apiClient.post<{ ok: boolean }>(`/payroll/runs/${runId}/recalculate`),
    onSuccess: (_, runId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.run(runId) });
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.runEmployeesAll(runId) });
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.runExceptionsAll(runId) });
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.runVariance(runId) });
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.commandCenterAll });
    },
  });
}
