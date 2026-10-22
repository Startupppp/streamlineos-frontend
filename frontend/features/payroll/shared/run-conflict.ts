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
