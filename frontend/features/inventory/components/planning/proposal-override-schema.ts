import { z } from "zod";

/**
 * C2 — what a person has to say to overrule the engine.
 *
 * The quantity stays a **string** the whole way. It is an exact `numeric(18,4)`
 * on the server, and a `Number()` between this field and the order line is
 * precisely the hop the inventory stack spends `exact.ts` avoiding — so it is
 * validated as a decimal literal and never parsed into one, not even to check
 * that it is positive. The lookahead does that: at least one digit is not zero.
 * The rest of the pattern is the column's own shape, and matches the API's.
 *
 * The reason has a floor rather than being merely required. "n/a" is what a
 * required-but-unenforced field collects, and a reason nobody can read six
 * months later is the same as no reason at all — which is the state that turns
 * an override back into a silent replacement of the engine's number.
 */
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
