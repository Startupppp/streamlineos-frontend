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
