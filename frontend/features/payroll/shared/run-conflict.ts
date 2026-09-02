"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { isApiError } from "@/lib/api-envelope";
import { getErrorMessage } from "@/lib/get-error-message";
import { queryKeys } from "@/lib/query-keys";

export function isRunConflict(error: unknown): boolean {
  return isApiError(error) && error.status === 409;
}

/**
 * A 409 on a run lifecycle action means the run moved underneath this screen, so the
 * generic error toast leaves the operator staring at the stale state that caused it.
 * This refetches the run's surfaces before reporting, so the retry is against truth.
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
        queryKeys.payroll.run(runId),
        [...queryKeys.payroll.all, "runs"],
        queryKeys.payroll.runEmployeesAll(runId),
        queryKeys.payroll.runExceptionsAll(runId),
        queryKeys.payroll.runInputsAll(runId),
        queryKeys.payroll.runVariance(runId),
        queryKeys.payroll.commandCenterAll,
      ];
      for (const queryKey of keys) void queryClient.invalidateQueries({ queryKey });

      toast.error("This run changed since you opened it", {
        description: `${getErrorMessage(error)} The screen has been refreshed — review the current state and try again.`,
      });
    },
    [queryClient, runId],
  );
}
