import { z } from "zod";

const assignmentRuleSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  conditions: z.unknown(),
  assignmentType: z.string(),
  assignToUserId: z.string().nullable(),
  assignToMembershipId: z.number().int().nullable(),
  roundRobinUserIds: z.unknown(),
  priority: z.number().int(),
  isActive: z.boolean(),
  config: z.unknown(),
  assignmentTypeText: z.string().nullable(),
  createdAt: z.string(),
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
