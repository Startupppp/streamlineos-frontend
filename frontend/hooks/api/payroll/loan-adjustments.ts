"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { CreateLoanAdjustmentInput } from "@/types/payroll/reports";

export function useCreateLoanAdjustment() {
  return useMutation({
    mutationKey: ["payroll", "loan-adjustments", "create"],
    mutationFn: ({ runId, ...data }: { runId: number } & CreateLoanAdjustmentInput) =>
      apiClient.post<{ ok: boolean }>(
        `/payroll/runs/${runId}/loan-adjustments`,
        data,
      ),
  });
}
