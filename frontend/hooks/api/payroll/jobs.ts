"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export type PayrollJobType =
  | "PREVIEW"
  | "GENERATE"
  | "RECALCULATE"
  | "PDF_PUBLISH"
  | "EXPORT"
  | "RECONCILE"
  | "FILING_EXPORT";

export interface PayrollJob {
  id: number;
  orgId?: string;
  jobType?: PayrollJobType | string;
  status: string;
  progress: number;
  correlationId?: string | null;
  errorMessage?: string | null;
  resourceId?: string | null;
  result?: Record<string, unknown> | null;
}

export const payrollJobKeys = {
  all: ["payroll", "jobs"] as const,
  one: (id: number) => ["payroll", "jobs", id] as const,
  forRun: (runId: number) => ["payroll", "jobs", "run", runId] as const,
  failed: () => ["payroll", "jobs", "failed"] as const,
};

export function usePayrollJob(jobId: number | null, opts?: { poll?: boolean }) {
  return useQuery({
    queryKey: payrollJobKeys.one(jobId ?? 0),
    queryFn: () => apiClient.get<PayrollJob>(`/payroll/jobs/${jobId}`),
    enabled: jobId != null && jobId > 0,
    refetchInterval: (query) => {
      if (!opts?.poll) return false;
      const status = query.state.data?.status;
      if (status === "PENDING" || status === "RUNNING") return 2000;
      return false;
    },
  });
}

export function useFailedPayrollJobs() {
  return useQuery({
    queryKey: payrollJobKeys.failed(),
    queryFn: () => apiClient.get<PayrollJob[]>("/payroll/jobs?failedOnly=true"),
    staleTime: 15_000,
  });
}

export function useEnqueuePayrollJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      jobType: PayrollJobType;
      runId?: number;
      payload?: Record<string, unknown>;
      idempotencyKey?: string;
    }) =>
      apiClient.post<{
        jobId: number;
        status: string;
        correlationId?: string;
        progress: number;
      }>("/payroll/jobs", body),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: payrollJobKeys.all });
      if (vars.runId) {
        void qc.invalidateQueries({ queryKey: payrollJobKeys.forRun(vars.runId) });
      }
    },
  });
}

export function useRetryPayrollJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: number) => apiClient.post<PayrollJob>(`/payroll/jobs/${jobId}/retry`, {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: payrollJobKeys.all });
    },
  });
}
