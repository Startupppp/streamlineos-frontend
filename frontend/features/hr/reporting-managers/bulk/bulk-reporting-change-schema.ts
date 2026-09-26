import { z } from "zod";

/** Mirrors the backend's `jobReason` (10..1000, trimmed) and the optional ISO effective date. */
export const bulkPreviewSchema = z.object({
  jobReason: z
    .string()
    .trim()
    .min(10, "Explain the change in at least 10 characters")
    .max(1000, "Keep the reason under 1,000 characters"),
  effectiveFrom: z.union([z.literal(""), z.iso.date("Use a valid date")]),
});

export type BulkPreviewValues = z.input<typeof bulkPreviewSchema>;

export const ROW_REASON_MIN = 10;

/** A per-row reason counts only with 10+ non-whitespace characters (backend D4 rule). */
export function isRowReasonValid(reason: string | undefined): boolean {
  return (reason ?? "").replace(/\s/g, "").length >= ROW_REASON_MIN;
}
