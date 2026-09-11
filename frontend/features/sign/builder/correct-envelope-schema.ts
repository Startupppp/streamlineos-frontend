import { z } from "zod";

/**
 * Mirrors `correctEnvelopeSchema` in the backend's `dto/e-sign.schemas.ts`, with
 * the empty string standing in for an absent optional so react-hook-form has a
 * controlled value; `""` is dropped back to `undefined` on submit.
 */
export const correctEnvelopeSchema = z.object({
  reason: z.string().trim().max(1000, "Reason must be at most 1000 characters"),
  recipients: z
    .array(
      z.object({
        id: z.number().int().positive(),
        name: z
          .string()
          .trim()
          .min(1, "Name is required")
          .max(200, "Name must be at most 200 characters"),
        email: z
          .string()
          .trim()
          .refine((v) => v === "" || z.string().email().safeParse(v).success, "Enter a valid email"),
        phone: z.string().trim().max(30, "Phone must be at most 30 characters"),
      }),
    )
    .max(50, "At most 50 recipients can be corrected at once"),
});

export type CorrectEnvelopeValues = z.infer<typeof correctEnvelopeSchema>;
