import { z } from "zod";

export const BGV_STATUS_VALUES = [
  "NOT_INITIATED",
  "INITIATED",
  "PENDING",
  "CLEARED",
  "FAILED",
] as const;

export const BGV_CHECK_TYPES = [
  "IDENTITY",
  "ADDRESS",
  "EDUCATION",
  "EMPLOYMENT",
  "CRIMINAL",
  "REFERENCE",
] as const;

/**
 * A candidate's background check, and who said so.
 *
 * `summary` is the server's own sentence and `agencyCleared` is the only field
 * anything should read to mean "an agency verified this". A CLEARED typed in by
 * a recruiter is legitimate and useful, and it is not the same claim — the
 * whole point of carrying `source` to the client is that the screen can tell
 * them apart instead of rendering one badge for both.
 */
export const bgvViewContract = z.object({
  candidateId: z.number().int(),
  status: z.enum(BGV_STATUS_VALUES),
  source: z.enum(["MANUAL", "AGENCY"]).nullable(),
  agency: z.string().nullable(),
  reference: z.string().nullable(),
  notes: z.string().nullable(),
  initiatedAt: z.coerce.date().nullable(),
  completedAt: z.coerce.date().nullable(),
  summary: z.string(),
  agencyCleared: z.boolean(),
  providerBlockedReason: z.string().nullable(),
});

export type BgvView = z.infer<typeof bgvViewContract>;
export type BgvCheckType = (typeof BGV_CHECK_TYPES)[number];
