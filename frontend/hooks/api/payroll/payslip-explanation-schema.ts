import { z } from "zod";
import { aiResultUsageSchema } from "@/hooks/api/ai-result-stream-schema";

export const payslipEvidenceCitationSchema = z.object({
  path: z.string(),
  label: z.string(),
  value: z.unknown(),
  source: z.literal("payroll_engine"),
});

export const payslipExplanationSchema = z.object({
  explanation: z.string(),
  evidenceSnapshot: z.record(z.string(), z.unknown()),
  citations: z.array(payslipEvidenceCitationSchema),
  capability: z.object({
    mode: z.literal("explain_draft_only"),
    autonomousPayrollDecisions: z.boolean(),
    honestyLabel: z.string(),
  }).optional(),
  forbiddenActions: z.array(z.string()).optional(),
  aiUsage: aiResultUsageSchema.optional(),
});
