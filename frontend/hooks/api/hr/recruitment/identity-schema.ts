import { z } from "zod";

export const IDENTITY_STATUSES = [
  "NOT_STARTED",
  "PENDING",
  "VERIFIED",
  "FAILED",
  /**
   * The check could not be run at all. Distinct from FAILED, which means a
   * vendor ran it and the identity did not hold up — one is a statement about
   * our setup, the other about a person, and a screen that renders them the
   * same turns a missing integration into an accusation.
   */
  "UNAVAILABLE",
] as const;

export const identityViewContract = z.object({
  candidateId: z.number().int(),
  status: z.enum(IDENTITY_STATUSES),
  reference: z.string().nullable(),
  /** Trailing characters only. The full number is never stored or sent. */
  last4: z.string().nullable(),
  verifiedAt: z.coerce.date().nullable(),
  /** True when a job this candidate applied to requires verification. */
  requiredByAJob: z.boolean(),
  providerBlockedReason: z.string().nullable(),
});

export type IdentityView = z.infer<typeof identityViewContract>;
export type IdentityStatus = IdentityView["status"];
