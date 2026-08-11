import { z } from "zod";

export const callLogSchema = z.object({
  direction: z.enum(["INBOUND", "OUTBOUND"]),
  outcome: z.enum(["CONNECTED", "NO_ANSWER", "VOICEMAIL", "BUSY", "WRONG_NUMBER"]),
  durationMinutes: z.string().optional(),
  notes: z.string().optional(),
  calledAt: z.string().optional(),
});

export type CallLogFormValues = z.infer<typeof callLogSchema>;
