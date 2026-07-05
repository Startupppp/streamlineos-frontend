"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { PolicyRow } from "@/types/payroll/setup";

type UpdateFxRatesInput = {
  policyId: number;
  fxRates: Record<string, number>;
};

export function useUpdateFxRates() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["payroll", "policies", "fx-rates"],
    mutationFn: ({ policyId, fxRates }: UpdateFxRatesInput) =>
      apiClient.patch<PolicyRow>(`/payroll/policies/${policyId}`, { fxRates }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.payroll.policy() }),
  });
}
