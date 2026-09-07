import { z } from "zod";

const pipelineSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  type: z.enum(["lead", "deal", "renewal", "customer_success", "partner", "custom"] as const).nullable(),
  key: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  isDefault: z.boolean(),
  isActive: z.boolean(),
  sortOrder: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

const pipelineStageSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  pipelineId: z.string(),
  key: z.string(),
  label: z.string(),
  description: z.string().nullable(),
  color: z.string().nullable(),
  icon: z.string().nullable(),
  sortOrder: z.number().int(),
  probability: z.number().int(),
  stageType: z.enum(["open", "won", "lost", "archived"] as const),
  isTerminal: z.boolean(),
  slaHours: z.number().int().nullable(),
  requiresApproval: z.boolean(),
  requiredFields: z.array(z.string()).nullable(),
  allowedNextStageKeys: z.array(z.string()).nullable(),
  isActive: z.boolean(),
  isSystemDefault: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const crmOptionSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  type: z.enum(["lead_status", "priority", "source", "lost_reason", "activity_type", "competitor", "forecast_category", "task_type", "contact_role"] as const),
  key: z.string(),
  label: z.string(),
  description: z.string().nullable(),
  color: z.string().nullable(),
  icon: z.string().nullable(),
  sortOrder: z.number().int(),
  isActive: z.boolean(),
  isSystemDefault: z.boolean(),
  isTerminal: z.boolean(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const uiMetadataSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  scope: z.string(),
  config: z.unknown().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const crmAggregateContract = z.object({
  pipelines: z.array(pipelineSchema),
  stages: z.array(pipelineStageSchema),
  options: z.array(crmOptionSchema),
  uiMetadata: z.array(uiMetadataSchema),
});

export const pipelineContract = pipelineSchema;
export const pipelineStageContract = pipelineStageSchema;
export const crmOptionContract = crmOptionSchema;

const validationRuleSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  entityType: z.enum(["lead", "deal", "contact", "company", "quote"] as const),
  field: z.string(),
  ruleType: z.enum([
    "required", "email", "phone", "url", "regex", "numeric_min", "numeric_max",
    "currency_min", "currency_max", "date_not_past", "date_not_future", "unique",
    "conditional_required", "stage_required", "source_required",
  ] as const),
  config: z.record(z.string(), z.unknown()).nullable(),
  pipelineId: z.string().nullable(),
  stageKey: z.string().nullable(),
  sourceKey: z.string().nullable(),
  errorMessage: z.string().nullable(),
  isActive: z.boolean(),
  sortOrder: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const validationRulesListContract = z.array(validationRuleSchema);
export const validationRuleContract = validationRuleSchema;

export const testValidationContract = z.object({
  valid: z.boolean(),
  errors: z.array(
    z.object({
      field: z.string(),
      ruleType: z.string(),
      message: z.string(),
    }),
  ),
});

const blueprintSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  pipelineId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const blueprintsListContract = z.array(blueprintSchema);
export const blueprintContract = blueprintSchema;

const blueprintTransitionSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  blueprintId: z.string(),
  fromStageKey: z.string(),
  toStageKey: z.string(),
  requiredFields: z.array(z.string()).nullable(),
  requiredActivityTypeKeys: z.array(z.string()).nullable(),
  requiresApproval: z.boolean(),
  requiresQuote: z.boolean(),
  autoTaskTemplates: z.array(z.record(z.string(), z.unknown())).nullable(),
  sortOrder: z.number().int(),
});

export const blueprintTransitionsListContract = z.array(blueprintTransitionSchema);
export const blueprintTransitionContract = blueprintTransitionSchema;

export const testTransitionContract = z.object({
  allowed: z.boolean(),
  requiresApproval: z.boolean(),
  missingFields: z.array(z.string()),
});

export const dataQualityAggSchema = z.object({
  count: z.number().int(),
  offenders: z.array(
    z.object({
      id: z.number().int(),
      name: z.string(),
      detail: z.string().optional(),
    }),
  ),
});

export const dataQualityReportContract = z.object({
  leadsWithoutEmail: dataQualityAggSchema,
  leadsWithInvalidPhone: dataQualityAggSchema,
  duplicateLeads: dataQualityAggSchema,
  duplicateCompanies: dataQualityAggSchema,
  staleDeals: dataQualityAggSchema,
  dealsWithNoNextActivity: dataQualityAggSchema,
  leadsWithNoOwner: dataQualityAggSchema,
  dealsMissingStageFields: dataQualityAggSchema,
});

export const deleteSuccessContract = z.object({ success: z.boolean() });
export const reorderSuccessContract = z.object({ success: z.boolean() });
