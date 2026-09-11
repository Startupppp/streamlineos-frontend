import { z } from "zod";

const assignmentRuleSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  assignmentType: z.enum(["assign_user", "round_robin", "weighted_round_robin", "least_loaded", "territory"] as const),
  assignToUserId: z.string().nullable(),
  assignToMembershipId: z.number().int().nullable(),
  roundRobinUserIds: z.array(z.string()).nullable(),
  weightedMembers: z.array(z.object({ userId: z.string(), weight: z.number() })).nullable(),
  windowHours: z.number().int().nullable(),
  territoryId: z.number().int().nullable(),
  conditions: z.array(z.object({ field: z.string(), operator: z.string(), value: z.string() })),
  priority: z.number().int(),
  isActive: z.boolean(),
  config: z.record(z.string(), z.unknown()).nullable(),
  assignmentTypeText: z.string().nullable(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
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
