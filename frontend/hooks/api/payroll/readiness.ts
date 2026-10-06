"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { payrollQueryKeys } from "@/lib/query-keys/payroll";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import type { PayrollReadiness, RunBlockerPage } from "@/hooks/api/payroll/readiness-schema";

export const READINESS_PAGE_LIMIT = 100;

const payrollReadinessC = lazyContract(() =>
  import("@/hooks/api/payroll/readiness-schema").then((m) => m.payrollReadinessContract),
);

const runBlockerPageC = lazyContract(() =>
  import("@/hooks/api/payroll/readiness-schema").then((m) => m.runBlockerPageContract),
);

export function usePayrollReadiness(month: string) {
  // The header cutoff chip and several HR screens read this on every page; an
  // owner holds the permission even with Payroll off, so without the module
  // check each page fired a 402 MODULE_NOT_ENABLED (BUG-HRMS-020).
  const canView = useCan("payroll:runs:view");
  const payrollOn = useModuleEnabled("payroll");
  return useQuery({
    queryKey: payrollQueryKeys.payroll.readiness(month),
    queryFn: ({ signal }) => apiClient.get<PayrollReadiness>("/payroll/readiness", { month }, signal, payrollReadinessC),
    staleTime: 30_000,
    enabled: canView && payrollOn && !!month,
  });
}

export function usePayrollRunBlockers(month: string, runId: number | null) {
  const canView = useCan("payroll:runs:view");
  const payrollOn = useModuleEnabled("payroll");
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
    enabled: canView && payrollOn && runId !== null && runId > 0,
  });
}
