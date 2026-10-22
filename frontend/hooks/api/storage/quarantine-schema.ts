import { z } from "zod";

export const QUARANTINE_STATUSES = ["pending_scan", "clean", "infected", "error"] as const;
export type QuarantineStatus = (typeof QUARANTINE_STATUSES)[number];

const quarantineRecordContract = z.object({
  id: z.string(),
  orgId: z.string(),
  storageKey: z.string(),
  filename: z.string(),
  mimeType: z.string(),
  fileSizeBytes: z.number().int().nonnegative(),
  sha256: z.string(),
  status: z.enum(QUARANTINE_STATUSES),
  threatName: z.string().nullable(),
  idempotencyKey: z.string().nullable(),
  uploadedBy: z.string(),
  createdAt: z.string(),
});
export type QuarantineRecord = z.infer<typeof quarantineRecordContract>;

export const quarantineListContract = z.object({
  data: z.array(quarantineRecordContract),
  pagination: z.object({
    limit: z.number().int().positive(),
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
  }),
});
export type QuarantineList = z.infer<typeof quarantineListContract>;

export const quarantineStatusContract = z.object({ status: z.enum(["clean", "infected"]) });
export const quarantineDeleteContract = z.object({ deleted: z.boolean() });
