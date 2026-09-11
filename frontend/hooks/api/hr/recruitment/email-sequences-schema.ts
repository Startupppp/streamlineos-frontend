import { z } from "zod";

const emailSequenceStepSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  sequenceId: z.number().int(),
  stepOrder: z.number().int(),
  delayDays: z.number().int(),
  subject: z.string(),
  htmlBody: z.string(),
  createdAt: z.string(),
});

const emailSequenceBaseSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  triggerType: z.enum(["MANUAL", "CANDIDATE_ADDED", "APPLICATION_RECEIVED", "STAGE_CHANGED", "OFFER_SENT"]),
  targetAudience: z.record(z.string(), z.unknown()),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const emailSequenceWithStepsSchema = emailSequenceBaseSchema.extend({
  steps: z.array(emailSequenceStepSchema),
});

export const emailSequenceListItemSchema = emailSequenceBaseSchema.extend({
  steps: z.array(emailSequenceStepSchema),
  enrollments: z.array(z.object({ id: z.number().int(), status: z.enum(["ACTIVE", "COMPLETED", "UNSUBSCRIBED", "BOUNCED"]) })),
  creator: z.object({ id: z.string(), name: z.string().nullable() }).optional(),
});

export const emailSequenceListSchema = z.array(emailSequenceListItemSchema);

export const emailSequenceSuccessSchema = z.object({ success: z.literal(true) });
