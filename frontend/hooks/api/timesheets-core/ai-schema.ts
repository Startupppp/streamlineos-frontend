import { z } from "zod";
import { aiResultUsageSchema } from "@/hooks/api/ai-result-stream-schema";

export const timesheetSummarySchema = z.object({
  narration: z.string(),
  evidence: z.record(z.string(), z.unknown()),
  aiUsage: aiResultUsageSchema.nullable().optional(),
});

export const timesheetDraftSchema = z.object({
  text: z.string(),
  aiUsage: aiResultUsageSchema.nullable().optional(),
});
