"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { payrollQueryKeys } from "@/lib/query-keys/payroll";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { sampleDataStatusContract, type SampleDataStatus } from "@/hooks/api/payroll/sample-data-schema";

const sampleDataKey = [...payrollQueryKeys.payroll.all, "sample-data"] as const;

export function usePayrollSampleData() {
  const canView = useCan("payroll:runs:view");
  return useQuery<SampleDataStatus, Error>({
    queryKey: sampleDataKey,
    queryFn: ({ signal }) => apiClient.get("/payroll/sample-data", undefined, signal, sampleDataStatusContract),
    staleTime: 60_000,
    enabled: canView,
  });
}

function useInvalidatePayroll() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.all });
  };
}

export function useSeedPayrollSampleData() {
  const invalidate = useInvalidatePayroll();
  return useAuthorizedMutation("payroll:settings:manage", {
    mutationKey: ["payroll", "sample-data", "seed"],
    mutationFn: () => apiClient.post("/payroll/sample-data", undefined, undefined, sampleDataStatusContract),
    onSuccess: invalidate,
  });
}

export function useRemovePayrollSampleData() {
  const invalidate = useInvalidatePayroll();
  return useAuthorizedMutation("payroll:settings:manage", {
    mutationKey: ["payroll", "sample-data", "remove"],
    mutationFn: () => apiClient.delete("/payroll/sample-data", undefined, undefined, sampleDataStatusContract),
    onSuccess: invalidate,
  });
}
