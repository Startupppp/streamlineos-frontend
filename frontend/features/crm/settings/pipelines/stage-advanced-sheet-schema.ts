import { z } from "zod";

export const stageAdvancedSchema = z.object({
  label: z.string().min(1, "Label required"),
  color: z.string().min(1),
  probability: z.string(),
  stageType: z.enum(["open", "won", "lost", "archived"] as const),
  slaHours: z.string(),
  requiresApproval: z.boolean(),
  isTerminal: z.boolean(),
  requiredFields: z.array(z.string()),
  allowedNextStageKeys: z.array(z.string()).nullable(),
});

export type StageAdvancedValues = z.infer<typeof stageAdvancedSchema>;
