import { z } from "zod";

export const consentSchema = z.object({
  channel: z.enum(["SMS", "WHATSAPP"]),
  destination: z.string().trim().min(3, "Enter the number").max(320, "Keep it under 320 characters"),
});

export type ConsentValues = z.output<typeof consentSchema>;
