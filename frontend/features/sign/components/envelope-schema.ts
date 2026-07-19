import { z } from "zod";

export const envelopeSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  message: z.string().trim().max(2000).optional(),
});

export type EnvelopeValues = z.infer<typeof envelopeSchema>;
