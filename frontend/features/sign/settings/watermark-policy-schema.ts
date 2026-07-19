import { z } from "zod";

export const ENVELOPE_STATES = ["draft", "sent", "completed", "voided", "expired"] as const;

export const watermarkPolicySchema = z.object({
  text: z.string().min(1, "Watermark text is required").max(100),
  states: z.array(z.string()).min(1, "Select at least one envelope state"),
  showOnFinalPdf: z.boolean(),
});

export type WatermarkPolicyValues = z.infer<typeof watermarkPolicySchema>;
