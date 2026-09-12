import { z } from "zod";

export const ACK_STATUSES = ["RECEIVED", "ACCEPTED", "REJECTED", "FAILED"] as const;

export const ackExportSchema = z.object({
  status: z.enum(ACK_STATUSES),
  note: z
    .string()
    .max(1000, "Note must be 1000 characters or fewer")
    .optional(),
});

export type AckExportInput = z.infer<typeof ackExportSchema>;
export type AckStatus = AckExportInput["status"];

const SETTLED: ReadonlySet<string> = new Set<AckStatus>(["ACCEPTED", "REJECTED", "FAILED"]);

export function isLegalAckMove(current: string | null, next: AckStatus): boolean {
  if (current === next) return false;
  if (next === "RECEIVED" && current !== null && SETTLED.has(current)) return false;
  return true;
}

export function legalAckStatuses(current: string | null): AckStatus[] {
  return ACK_STATUSES.filter((status) => isLegalAckMove(current, status));
}
