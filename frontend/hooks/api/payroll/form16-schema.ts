import { z } from "zod";

export const form16StatusContract = z.enum(["missing", "uploaded", "released"]);

export const form16RowContract = z.object({
  userMembershipId: z.number(),
  employeeName: z.string().nullable(),
  email: z.string().nullable(),
  status: form16StatusContract,
  fileName: z.string().nullable(),
  fileSizeBytes: z.number().nullable(),
  uploadedAt: z.string().nullable(),
  releasedAt: z.string().nullable(),
});

export const form16ListContract = z.object({
  financialYear: z.string(),
  rows: z.array(form16RowContract),
  counts: z.object({ missing: z.number(), uploaded: z.number(), released: z.number() }),
});

export const form16ReleaseAllContract = z.object({
  financialYear: z.string(),
  released: z.number(),
});

export const essForm16ListContract = z.object({
  documents: z.array(
    z.object({
      financialYear: z.string(),
      fileName: z.string(),
      releasedAt: z.string().nullable(),
    }),
  ),
});

export type Form16Row = z.infer<typeof form16RowContract>;
export type Form16Status = z.infer<typeof form16StatusContract>;
