import { z } from "zod";
import { LANDED_COST_CHARGE_TYPES } from "@/hooks/api/inventory/landed-cost";

/**
 * Mirrors `createLandedCostVoucherSchema`.
 *
 * Amounts are typed as decimal text and converted to integer minor units at the
 * boundary, because the backend takes only integers here and says why: this
 * number becomes both a debit and a credit in the general ledger, so a binary
 * fraction in it is an unbalanced journal entry rather than a rounding
 * curiosity. Keeping the field text lets somebody type "1250.75" and get
 * 125075 exactly, instead of a float that is nearly that.
 */
export const landedCostChargeSchema = z.object({
  chargeType: z.enum(LANDED_COST_CHARGE_TYPES),
  description: z.string().trim().min(1, "Say what this charge is").max(300),
  amount: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "An amount with at most two decimal places")
    .refine((value) => Number(value) > 0, "The amount has to be more than zero"),
  reference: z.string().trim().max(120).optional(),
});

export const createLandedCostVoucherFormSchema = z.object({
  grnId: z.string().min(1, "Choose the receipt these costs belong to"),
  allocationBasis: z.enum(["VALUE", "QUANTITY"]),
  currency: z.string().trim().length(3),
  notes: z.string().trim().max(2000).optional(),
  charges: z.array(landedCostChargeSchema).min(1, "A voucher needs at least one charge"),
});

export type CreateLandedCostVoucherFormValues = z.input<typeof createLandedCostVoucherFormSchema>;
export type CreateLandedCostVoucherFormOutput = z.output<typeof createLandedCostVoucherFormSchema>;

/** Decimal text to integer minor units, without ever building a float. */
export function toMinorUnits(amount: string): number {
  const [whole = "0", fraction = ""] = amount.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0").slice(0, 2));
}

/** Integer minor units back to decimal text, for display. */
export function fromMinorUnits(cents: string): string {
  const negative = cents.startsWith("-");
  const digits = (negative ? cents.slice(1) : cents).padStart(3, "0");
  const whole = digits.slice(0, -2);
  const fraction = digits.slice(-2);
  return `${negative ? "-" : ""}${whole}.${fraction}`;
}
