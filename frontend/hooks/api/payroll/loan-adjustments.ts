"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { payrollQueryKeys } from "@/lib/query-keys/payroll";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { CreateLoanAdjustmentInput } from "@/types/payroll/reports";

const loanAdjustmentC = lazyContract(() =>
  import("@/hooks/api/payroll/loan-adjustments-schema").then((m) => m.loanAdjustmentResponseContract),
);

export function useCreateLoanAdjustment() {
  const qc = useQueryClient();
  return useAuthorizedMutation("payroll:runs:update", {
    mutationKey: ["payroll", "loan-adjustments", "create"],
    mutationFn: ({ runId, ...data }: { runId: number } & CreateLoanAdjustmentInput) =>
      apiClient.post<{ ok: boolean }>(
        `/payroll/runs/${runId}/loan-adjustments`,
        data, undefined, loanAdjustmentC,
      ),
    onSuccess: (_, { runId }) => {
      void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.run(runId) });
      void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.runEmployeesAll(runId) });
      void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.runExceptionsAll(runId) });
      void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.commandCenterAll });
    },
  });
}
