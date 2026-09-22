"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { payrollQueryKeys } from "@/lib/query-keys/payroll";
import { useCan } from "@/hooks/api/access";
import type { PayrollReadiness } from "@/hooks/api/payroll/readiness-schema";

const payrollReadinessC = lazyContract(() =>
  import("@/hooks/api/payroll/readiness-schema").then((m) => m.payrollReadinessContract),
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
