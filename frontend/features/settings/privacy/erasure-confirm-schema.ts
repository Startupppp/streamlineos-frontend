import { z } from "zod";

/** The typed confirm for an erasure: the subject's email, exactly (case-insensitive), plus an optional reason. */
export function erasureConfirmSchema(email: string, withReason: boolean) {
  return z.object({
    confirmEmail: z
      .string()
      .trim()
      .refine((typed) => typed.toLowerCase() === email.trim().toLowerCase(), "Type the subject's email exactly"),
    reason: withReason
      ? z.string().trim().min(1, "Say why this data is being erased").max(500, "Keep it under 500 characters")
      : z.string(),
  });
}

export type ErasureConfirmValues = z.output<ReturnType<typeof erasureConfirmSchema>>;
