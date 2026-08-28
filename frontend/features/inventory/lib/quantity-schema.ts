import { z } from "zod";

/**
 * The stock engine accepts quantities as decimal strings at scale 4 — the
 * backend DTO is `/^\d+(\.\d{1,4})?$/` — and never as JS numbers. A form that
 * holds a `number` has to call `toFixed(4)` on the way out, and float rounding
 * on a quantity that becomes a ledger row is exactly the arithmetic the
 * inventory PRD forbids. So the field holds the string the operator typed and
 * sends it unchanged.
 *
 * Matches the `so-schema`/`po-schema` line idiom, tightened to the scale the
 * server actually enforces so a fourth decimal place is rejected in the form
 * rather than by a 400.
 */
export const decimalQuantitySchema = z
  .string()
  .min(1, "Quantity is required")
  .regex(/^\d+(\.\d{1,4})?$/, "Use a positive number with up to 4 decimal places")
  .refine((v) => parseFloat(v) > 0, { message: "Quantity must be greater than 0" });

/**
 * The same contract, but zero is meaningful. On a receiving workbench every
 * outstanding line is rendered and a zero means "nothing arrived for this one",
 * so rejecting zero would force the receiver to delete rows to say the ordinary
 * thing.
 */
export const decimalQuantityOrZeroSchema = z
  .string()
  .min(1, "Quantity is required")
  .regex(/^\d+(\.\d{1,4})?$/, "Use a number with up to 4 decimal places");
