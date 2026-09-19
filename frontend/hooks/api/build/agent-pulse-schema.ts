import { z } from "zod";

export const agentPulseSignalTypeSchema = z.enum([
  "delivery_risk",
  "comment_draft",
  "overdue_approval",
  "blocked_milestone",
  "dependency_change",
]);

export const agentPulseContract = z
  .object({
    title: z.string(),
    entityId: z.number().int(),
    projectId: z.number().int(),
    dueAt: z.string().nullable(),
    type: agentPulseSignalTypeSchema,
  })
  .nullable();

export type AgentPulseSignalType = z.infer<typeof agentPulseSignalTypeSchema>;
export type AgentPulseSignal = Exclude<z.infer<typeof agentPulseContract>, null>;
