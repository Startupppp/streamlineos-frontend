import { z } from "zod";

/**
 * One `lead_assignment_rules` row as the server returns it. It has no
 * `updatedAt` column, and the weighted/territory arms live in `config` and
 * `assignmentTypeText`, not in columns of their own; the response is validated
 * here, so a field the table does not have would fail every read.
 */
const assignmentRuleSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  assignmentType: z.enum(["assign_user", "round_robin"] as const),
  assignmentTypeText: z
    .enum(["assign_user", "round_robin", "weighted_round_robin", "least_loaded", "territory"] as const)
    .nullable(),
  assignToUserId: z.string().nullable(),
  roundRobinUserIds: z.array(z.string()).nullable(),
  config: z
    .object({
      weights: z.record(z.string(), z.number()).optional(),
      fallbackUserId: z.string().optional(),
    })
    .nullable(),
  conditions: z.array(z.object({ field: z.string(), operator: z.string(), value: z.string() })),
  priority: z.number().int(),
  isActive: z.boolean(),
  createdAt: z.string().nullable(),
});

export const assignmentRulesListContract = z.array(assignmentRuleSchema);
export const assignmentRuleContract = assignmentRuleSchema;

export const assignmentPreviewContract = z.object({
  matchedRule: z
    .object({ id: z.number().int(), name: z.string() })
    .nullable(),
  wouldAssignTo: z.string().nullable(),
  trace: z.array(
    z.object({
      ruleId: z.number().int(),
      ruleName: z.string(),
      matched: z.boolean(),
      reason: z.string(),
    }),
  ),
});

export const deleteAssignmentRuleContract = z.object({ success: z.boolean() });
