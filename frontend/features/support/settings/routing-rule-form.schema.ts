import { z } from "zod";

export const conditionSchema = z.object({
  field: z.string().min(1, "Field required"),
  op: z.enum(["eq", "neq", "contains"]),
  value: z.string().min(1, "Value required"),
});

export const ruleSchema = z.object({
  name: z.string().min(1, "Name required").max(100),
  conditions: z.array(conditionSchema).min(1, "At least one condition required"),
  assigneeId: z.string(),
  setPriority: z.string(),
  assignmentMode: z.enum(["static", "round_robin", "load_balanced", "skill_based", "availability_based"]),
  candidateAgentIds: z.array(z.string()),
  requiredSkills: z.array(z.string()),
  isEnabled: z.boolean(),
});

export type RuleForm = z.infer<typeof ruleSchema>;
