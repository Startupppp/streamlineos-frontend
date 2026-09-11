import { z } from "zod";

const candidateReferralRowSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  candidateId: z.number().int(),
  referredBy: z.string(),
  referredByMembershipId: z.number().int().nullable(),
  jobPostingId: z.number().int().nullable(),
  relationship: z.string().nullable(),
  notes: z.string().nullable(),
  status: z.enum(["SUBMITTED", "REVIEWING", "HIRED", "REJECTED", "BONUS_PAID"]),
  bonusEligible: z.boolean(),
  bonusAmount: z.string().nullable(),
  bonusPaidAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const candidateReferralWithRelationsSchema = candidateReferralRowSchema.extend({
  candidate: z.object({
    id: z.number().int(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
  }).nullable(),
  referrer: z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string().nullable(),
  }).nullable(),
  jobPosting: z.object({ id: z.number().int(), title: z.string() }).nullable(),
});

export const allReferralsListContract = z.array(candidateReferralWithRelationsSchema);

export const submitReferralContract = candidateReferralWithRelationsSchema;

export const updateReferralStatusContract = candidateReferralWithRelationsSchema;
