"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";

export interface PayslipExplanationResult {
  explanation: string;
  evidenceSnapshot: Record<string, unknown>;
}

export function useExplainPayslip(publicationId: number) {
  return useMutation({
    mutationKey: ["payroll", "ess", "payslips", publicationId, "ai-explain"],
    mutationFn: () =>
      apiClient.post<PayslipExplanationResult>(
        `/payroll/me/payslips/${publicationId}/ai/explain`,
        {},
      ),
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}
