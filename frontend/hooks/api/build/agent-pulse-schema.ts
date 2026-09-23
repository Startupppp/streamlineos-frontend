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
    evidence: z.string().nullable().optional(),
    proposedChange: z.string().nullable().optional(),
    impact: z.string().nullable().optional(),
    confidence: z.number().int().min(0).max(100).nullable().optional(),
    affectedRecordIds: z.array(z.number().int()).nullable().optional(),
    retryCount: z.number().int().nonnegative().optional(),
  })
  .nullable();

export type AgentPulseSignalType = z.infer<typeof agentPulseSignalTypeSchema>;
export type AgentPulseSignal = Exclude<z.infer<typeof agentPulseContract>, null>;
