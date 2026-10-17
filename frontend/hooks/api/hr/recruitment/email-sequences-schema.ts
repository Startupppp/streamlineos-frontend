import { z } from "zod";

/**
 * Every status `email_sequence_enrollments.status` can hold, in the backend's
 * order.
 *
 * This list narrowed to four values while the sender had already started
 * writing a fifth, `HELD_NO_CONSENT`: the enum threw on parse, so a sequence
 * with one held enrollment took the whole screen down with it — and the
 * enrollment that was held for a consent reason is precisely the one a
 * recruiter needed to see. Any value added on the backend belongs here in the
 * same change.
 */
export const ENROLLMENT_STATUSES = [
  "ACTIVE",
  "COMPLETED",
  "UNSUBSCRIBED",
  "BOUNCED",
  "HELD_NO_CONSENT",
  "STOPPED_SUPPRESSED",
  "STOPPED_APPLIED",
  "STOPPED_REPLIED",
  "STOPPED_CLOSED",
] as const;

export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

/**
 * How a campaign is doing. `byStatus` is keyed by every status above, so a
 * screen can show where enrollments stalled rather than only the totals.
 */
export const nurtureMetricsContract = z.object({
  sequenceId: z.number().int(),
  enrolled: z.number().int(),
  sent: z.number().int(),
  replied: z.number().int(),
  converted: z.number().int(),
  byStatus: z.object(
    Object.fromEntries(ENROLLMENT_STATUSES.map((status) => [status, z.number().int()])),
  ),
});

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
  enrollments: z.array(
    z.object({ id: z.number().int(), status: z.enum(ENROLLMENT_STATUSES) }),
  ),
  creator: z.object({ id: z.string(), name: z.string().nullable() }).optional(),
});

export const emailSequenceListSchema = z.array(emailSequenceListItemSchema);

export const emailSequenceSuccessSchema = z.object({ success: z.literal(true) });
