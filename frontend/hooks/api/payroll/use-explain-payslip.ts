"use client";

import type { z } from "zod";
import { streamAiResult, type AiResultStreamOptions } from "@/hooks/api/ai-result-stream";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { payslipExplanationSchema, payslipEvidenceCitationSchema } from "./payslip-explanation-schema";

export type PayslipEvidenceCitation = z.infer<typeof payslipEvidenceCitationSchema>;
export type PayslipExplanationResult = z.infer<typeof payslipExplanationSchema>;

export function useExplainPayslip(publicationId: number) {
  return useAuthorizedMutation<PayslipExplanationResult, Error, AiResultStreamOptions | void>("self:payslips", {
    mutationKey: ["payroll", "ess", "payslips", publicationId, "ai-explain"],
    mutationFn: (input) =>
      streamAiResult({
        path: `/payroll/me/payslips/${publicationId}/ai/explain/stream`,
        schema: payslipExplanationSchema,
        ...input,
      }),
  });
}
