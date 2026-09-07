import { z } from "zod";

const emailSequenceStepContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  sequenceId: z.number().int(),
  stepOrder: z.number().int(),
  delayDays: z.number().int(),
  subject: z.string(),
  htmlBody: z.string(),
  createdAt: z.string(),
});

const emailSequenceBaseContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  triggerType: z.string(),
  targetAudience: z.record(z.string(), z.unknown()),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const emailSequenceWithStepsContract = emailSequenceBaseContract.extend({
  steps: z.array(emailSequenceStepContract),
});

export type EmailSequenceWithSteps = z.infer<typeof emailSequenceWithStepsContract>;
