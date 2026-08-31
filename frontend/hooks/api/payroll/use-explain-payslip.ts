"use client";

import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { AiUsageMeta } from "@/components/ai/ai-usage-chip";

export interface PayslipEvidenceCitation {
  path: string;
  label: string;
  value: unknown;
  source: "payroll_engine";
}

export interface PayslipExplanationResult {
  explanation: string;
  evidenceSnapshot: Record<string, unknown>;
  citations: PayslipEvidenceCitation[];
  capability?: {
    mode: "explain_draft_only";
    autonomousPayrollDecisions: boolean;
    honestyLabel: string;
  };
  forbiddenActions?: string[];
  aiUsage?: AiUsageMeta;
}

export function useExplainPayslip(publicationId: number) {
  return useAuthorizedMutation("self:payslips", {
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
