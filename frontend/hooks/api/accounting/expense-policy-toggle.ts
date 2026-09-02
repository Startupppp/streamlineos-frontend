"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const policiesKey = [...queryKeys.accounting.all, "expenses", "policies"] as const;

interface TogglePolicyInput {
  policyId: number;
  isActive: boolean;
}

export function useTogglePolicyActive() {
  const qc = useQueryClient();
  return useAuthorizedMutation<{ success: boolean }, Error, TogglePolicyInput>(
    "accounting:reimbursements:manage",
    {
      mutationKey: ["accounting", "expenses", "policies", "toggle"],
      mutationFn: ({ policyId, isActive }) =>
        apiClient.patch<{ success: boolean }>(
          `/accounting/expenses/policies/${policyId}`,
          { isActive },
        ),
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: policiesKey });
      },
    },
  );
}
