import { z } from "zod";

const scoringRuleSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  field: z.string(),
  operator: z.string(),
  value: z.string(),
  points: z.number().int(),
  dimension: z.string(),
  createdAt: z.string(),
});

export const scoringRulesListContract = z.array(scoringRuleSchema);
export const scoringRuleContract = scoringRuleSchema;

export const deleteScoringRuleContract = z.object({ success: z.boolean() });
