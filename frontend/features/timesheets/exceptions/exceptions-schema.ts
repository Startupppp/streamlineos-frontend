import { z } from "zod";

export const exceptionReasonSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, "Reason must be at least 3 characters")
    .max(500, "Reason must be 500 characters or less"),
});

export type ExceptionReasonValues = z.infer<typeof exceptionReasonSchema>;
