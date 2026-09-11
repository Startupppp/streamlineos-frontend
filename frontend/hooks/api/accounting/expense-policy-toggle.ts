"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { accountingAndSupportQueryKeys } from "@/lib/query-keys/accounting-and-support";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { z } from "zod";

const policyToggleContract = z.object({ success: z.boolean() });

const policiesKey = [...accountingAndSupportQueryKeys.accounting.all, "expenses", "policies"] as const;

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
        apiClient.patch(
          `/accounting/expenses/policies/${policyId}`,
          { isActive }, undefined, policyToggleContract,
        ),
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: policiesKey });
      },
    },
  );
}
