import { z } from "zod";

export const logTimeSchema = z.object({
  date: z.string().min(1, "Date is required"),
  hours: z
    .string()
    .min(1, "Hours is required")
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid number (e.g. 1.5)"),
  projectId: z.number().nullable(),
  ticketId: z.number().nullable(),
  description: z.string(),
  isBillable: z.boolean(),
});

export type LogTimeValues = z.infer<typeof logTimeSchema>;
