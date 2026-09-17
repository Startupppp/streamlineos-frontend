import { z } from "zod";

export const selfReferralContract = z.object({
  id: z.number().int(),
  candidateId: z.number().int(),
  jobPostingId: z.number().int().nullable(),
  relationship: z.string().nullable(),
  notes: z.string().nullable(),
  status: z.string(),
  bonusEligible: z.boolean(),
  bonusAmount: z.string().nullable(),
  createdAt: z.string(),
  candidate: z
    .object({
      id: z.number().int(),
      firstName: z.string(),
      lastName: z.string(),
      email: z.string(),
    })
    .nullable(),
  jobPosting: z
    .object({ id: z.number().int(), title: z.string() })
    .nullable(),
});

export const selfReferralsContract = z.array(selfReferralContract);

export const selfReferralRowContract = z.object({
  id: z.number().int(),
});

export type SelfReferral = z.infer<typeof selfReferralContract>;
