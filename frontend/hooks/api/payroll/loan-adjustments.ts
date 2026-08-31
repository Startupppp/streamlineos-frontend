"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { CreateLoanAdjustmentInput } from "@/types/payroll/reports";

export function useCreateLoanAdjustment() {
  const qc = useQueryClient();
  return useAuthorizedMutation("payroll:runs:update", {
    mutationKey: ["payroll", "loan-adjustments", "create"],
    mutationFn: ({ runId, ...data }: { runId: number } & CreateLoanAdjustmentInput) =>
      apiClient.post<{ ok: boolean }>(
        `/payroll/runs/${runId}/loan-adjustments`,
        data,
      ),
    onSuccess: (_, { runId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.run(runId) });
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.runEmployeesAll(runId) });
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.runExceptionsAll(runId) });
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.commandCenterAll });
    },
  });
}
