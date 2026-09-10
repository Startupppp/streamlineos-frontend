import { z } from "zod";
import {
  automationActionResultSchema,
  automationRuleListItemSchema,
  automationRunItemSchema,
  automationRunStatusEnum,
} from "@/hooks/api/automations-schema";

export const supportAutomationListContract = z.object({
  data: z.array(automationRuleListItemSchema),
  pagination: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
});

export const supportAutomationContract = automationRuleListItemSchema;

export const supportAutomationDeleteContract = z.object({ success: z.literal(true) });

export const supportAutomationRunsContract = z.array(automationRunItemSchema);

export const supportAutomationTestContract = z.object({
  runId: z.number().int(),
  matched: z.boolean(),
  status: automationRunStatusEnum,
  actionResults: z.array(automationActionResultSchema),
});

export type SupportAutomationRun = z.infer<typeof automationRunItemSchema>;
