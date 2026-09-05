"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { payrollQueryKeys } from "@/lib/query-keys/payroll";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { PolicyRow } from "@/types/payroll/setup";

type UpdateFxRatesInput = {
  policyId: number;
  fxRates: Record<string, number>;
};

export function useUpdateFxRates() {
  const qc = useQueryClient();
  return useAuthorizedMutation("payroll:policies:manage", {
    mutationKey: ["payroll", "policies", "fx-rates"],
    mutationFn: ({ policyId, fxRates }: UpdateFxRatesInput) =>
      apiClient.patch<PolicyRow>(`/payroll/policies/${policyId}`, { fxRates }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.policy() }),
  });
}
