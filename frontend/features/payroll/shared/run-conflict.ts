"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { isApiError } from "@/lib/api-envelope";
import { getErrorMessage } from "@/lib/get-error-message";
import { payrollQueryKeys } from "@/lib/query-keys/payroll";

export function isRunConflict(error: unknown): boolean {
  return isApiError(error) && error.status === 409;
}

/**
 * A 409 on a run lifecycle OR payout action means the run moved underneath this
 * screen, so the generic error toast leaves the operator staring at the stale
 * state that caused it. This refetches the run's surfaces before reporting, so
 * the retry is against truth.
 *
 * The payout batch keys hang off `payroll/payout/batches`, not `payroll/runs`,
 * so the run prefix below never reaches them — and a batch 409 (a batch already
 * sent, or migration 1049 refusing a second live instruction) is precisely a
 * stale batch list.
 */
export function useRunConflictHandler(runId: number): (error: unknown) => void {
  const queryClient = useQueryClient();

  return useCallback(
    (error: unknown) => {
      if (!isRunConflict(error)) {
        toast.error(getErrorMessage(error));
        return;
      }

      const keys = [
        payrollQueryKeys.payroll.run(runId),
        [...payrollQueryKeys.payroll.all, "runs"],
        payrollQueryKeys.payroll.runEmployeesAll(runId),
        payrollQueryKeys.payroll.runExceptionsAll(runId),
        payrollQueryKeys.payroll.runInputsAll(runId),
        payrollQueryKeys.payroll.runVariance(runId),
        payrollQueryKeys.payroll.commandCenterAll,
        payrollQueryKeys.payroll.bankBatches(),
        payrollQueryKeys.payroll.bankValidation(runId),
      ];
      for (const queryKey of keys) void queryClient.invalidateQueries({ queryKey });

      toast.error("This run changed since you opened it", {
        description: `${getErrorMessage(error)} The screen has been refreshed — review the current state and try again.`,
      });
    },
    [queryClient, runId],
  );
}
