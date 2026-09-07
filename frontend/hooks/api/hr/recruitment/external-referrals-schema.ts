import { z } from "zod";

const externalReferralBaseSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  referrerId: z.number().int(),
  candidateId: z.number().int(),
  jobPostingId: z.number().int().nullable(),
  status: z.enum(["SUBMITTED", "REVIEWING", "HIRED", "REJECTED", "INELIGIBLE", "REWARD_PENDING", "REWARD_PAID"]),
  rewardAmount: z.string().nullable(),
  rewardPaidAt: z.string().nullable(),
  ipAddress: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const externalReferralWithRelationsSchema = externalReferralBaseSchema.extend({
  candidate: z
    .object({ id: z.number().int(), firstName: z.string(), lastName: z.string(), email: z.string() })
    .nullable(),
  referrer: z.object({ id: z.number().int(), name: z.string(), email: z.string() }).nullable(),
  jobPosting: z.object({ id: z.number().int(), title: z.string() }).nullable(),
});

export const externalReferralListSchema = z.array(externalReferralWithRelationsSchema);

export const externalReferralRawSchema = externalReferralBaseSchema;

export const externalReferrerListItemSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  status: z.enum(["ACTIVE", "BLOCKED"]),
  createdAt: z.string(),
  referralCount: z.number().int(),
});

export const externalReferrerListSchema = z.array(externalReferrerListItemSchema);

export const externalReferrerRowSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  referralToken: z.string(),
  status: z.enum(["ACTIVE", "BLOCKED"]),
  emailVerifiedAt: z.string().nullable(),
  createdAt: z.string(),
  referralCount: z.number().int(),
});
