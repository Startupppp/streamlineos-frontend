import { z } from "zod";

export const IDENTITY_STATUSES = [
  "NOT_STARTED",
  "PENDING",
  "VERIFIED",
  "FAILED",
  "UNAVAILABLE",
] as const;

export const identityViewContract = z.object({
  candidateId: z.number().int(),
  status: z.enum(IDENTITY_STATUSES),
  reference: z.string().nullable(),
  last4: z.string().nullable(),
  verifiedAt: z.coerce.date().nullable(),
  requiredByAJob: z.boolean(),
  providerBlockedReason: z.string().nullable(),
});

export type IdentityView = z.infer<typeof identityViewContract>;
export type IdentityStatus = IdentityView["status"];
