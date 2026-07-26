import { z } from "zod";

export const ackExportSchema = z.object({
  status: z.enum(["RECEIVED", "ACCEPTED", "REJECTED", "FAILED"]),
  note: z
    .string()
    .max(1000, "Note must be 1000 characters or fewer")
    .optional(),
});

export type AckExportInput = z.infer<typeof ackExportSchema>;
export type AckStatus = AckExportInput["status"];
