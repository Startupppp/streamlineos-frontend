import { z } from "zod";
import type { CrmValidationRuleType } from "@/types/crm/metadata";

export const ALL_RULE_TYPES = [
  "required",
  "unique",
  "email",
  "phone",
  "url",
  "regex",
  "numeric_min",
  "numeric_max",
  "currency_min",
  "currency_max",
  "date_not_past",
  "date_not_future",
  "conditional_required",
  "stage_required",
  "source_required",
] as const satisfies readonly CrmValidationRuleType[];

export const ruleSchema = z.object({
  entityType: z.enum(["lead", "deal", "contact", "company", "quote"]),
  field: z.string().min(1, "Field is required"),
  ruleType: z.enum(ALL_RULE_TYPES),
  configPattern: z.string().optional(),
  configValue: z.string().optional(),
  configConditionField: z.string().optional(),
  configConditionValue: z.string().optional(),
  pipelineId: z.string().nullable().optional(),
  stageKey: z.string().nullable().optional(),
  sourceKey: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  isActive: z.boolean(),
});

export type RuleFormValues = z.infer<typeof ruleSchema>;
