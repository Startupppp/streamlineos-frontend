import { z } from "zod";

export const conditionSchema = z.object({
  field: z.string().min(1, "Field required"),
  operator: z.string().min(1, "Operator required"),
  value: z.string().min(1, "Value required"),
});

export const weightedMemberSchema = z.object({
  userId: z.string().min(1, "Member required"),
  weight: z.number().min(0).max(100),
});

export const ruleFormSchema = z.object({
  name: z.string().min(1, "Name required").max(100),
  isActive: z.boolean(),
  assignmentType: z.enum([
    "assign_user",
    "round_robin",
    "weighted_round_robin",
    "least_loaded",
    "territory",
  ]),
  conditions: z.array(conditionSchema).min(1, "At least one condition required"),
  assignToUserId: z.string().optional(),
  roundRobinUserIds: z.string().optional(),
  weightedMembers: z.array(weightedMemberSchema).optional(),
  windowHours: z.string().optional(),
  territoryId: z.string().optional(),
});

export type RuleFormValues = z.infer<typeof ruleFormSchema>;
