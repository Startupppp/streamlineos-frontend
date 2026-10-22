import { z } from "zod";

export const OVERRIDE_QUANTITY_PATTERN = /^(?=.*[1-9])\d{1,14}(\.\d{1,4})?$/;

export const proposalOverrideSchema = z.object({
  quantity: z
    .string()
    .trim()
    .regex(
      OVERRIDE_QUANTITY_PATTERN,
      "Enter a quantity above zero, with at most four decimal places",
    ),
  reason: z
    .string()
    .trim()
    .min(10, "Say what you know that the forecast does not — at least 10 characters")
    .max(500, "Keep the reason under 500 characters"),
});

export type ProposalOverrideFormValues = z.infer<typeof proposalOverrideSchema>;
