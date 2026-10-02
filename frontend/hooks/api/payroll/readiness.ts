"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { payrollQueryKeys } from "@/lib/query-keys/payroll";
import { useCan } from "@/hooks/api/access";
import type { PayrollReadiness, RunBlockerPage } from "@/hooks/api/payroll/readiness-schema";

export const READINESS_PAGE_LIMIT = 100;

const payrollReadinessC = lazyContract(() =>
  import("@/hooks/api/payroll/readiness-schema").then((m) => m.payrollReadinessContract),
);

const runBlockerPageC = lazyContract(() =>
  import("@/hooks/api/payroll/readiness-schema").then((m) => m.runBlockerPageContract),
);

export function usePayrollReadiness(month: string) {
  const canView = useCan("payroll:runs:view");
  return useQuery({
    queryKey: payrollQueryKeys.payroll.readiness(month),
    queryFn: ({ signal }) => apiClient.get<PayrollReadiness>("/payroll/readiness", { month }, signal, payrollReadinessC),
    staleTime: 30_000,
    enabled: canView && !!month,
  });
}

export function usePayrollRunBlockers(month: string, runId: number | null) {
  const canView = useCan("payroll:runs:view");
  return useQuery({
    queryKey: [...payrollQueryKeys.payroll.readiness(month), "run-blockers", runId] as const,
    queryFn: ({ signal }) =>
      apiClient.get<RunBlockerPage>(
        `/payroll/runs/${runId}/exceptions`,
        { limit: READINESS_PAGE_LIMIT },
        signal,
        runBlockerPageC,
      ),
    staleTime: 30_000,
    enabled: canView && runId !== null && runId > 0,
  });
}
