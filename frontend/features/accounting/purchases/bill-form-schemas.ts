import { z } from "zod";
import {
  addDecimals,
  allocateDecimal,
  divideDecimals,
  multiplyDecimals,
  roundDecimal,
  subtractDecimals,
  sumDecimals,
  toDecimalInput,
} from "@/lib/accounting/decimal";

export const GST_RATES = ["0", "5", "12", "18", "28"] as const;

export const GST_RATE_MAP: Record<typeof GST_RATES[number], 0 | 5 | 12 | 18 | 28> = {
  "0": 0,
  "5": 5,
  "12": 12,
  "18": 18,
  "28": 28,
};

export const lineItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  hsnSacCode: z.string(),
  quantity: z
    .string()
    .refine((v) => Number(v) > 0, { message: "Must be greater than 0" }),
  rate: z
    .string()
    .refine((v) => Number(v) >= 0, { message: "Must be 0 or more" }),
  gstRate: z.enum(GST_RATES),
});

export const newBillSchema = z.object({
  vendorId: z.string().min(1, "Vendor is required"),
  vendorBillNumber: z.string(),
  billDate: z.string().min(1, "Bill date is required"),
  dueDate: z.string(),
  status: z.enum(["DRAFT", "POSTED"]),
  placeOfSupply: z.string(),
  vendorGstin: z.string(),
  supplierGstin: z.string(),
  reverseCharge: z.boolean(),
  discount: z
    .string()
    .refine((v) => Number(v) >= 0, { message: "Must be 0 or more" }),
  notes: z.string(),
  expenseAccountCode: z.string().min(1, "Expense account is required"),
  items: z.array(lineItemSchema).min(1, "At least one line item is required"),
});

export type NewBillFormValues = z.infer<typeof newBillSchema>;

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function num(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/**
 * Every figure here is a decimal STRING at the ledger's scale, produced by the
 * same operations in the same order as `accounting-payables.service.ts`
 * (`createPurchaseBill`). The panel the approver reads must equal the row that
 * is written: computed in doubles at scale 2, a tax pool of 9.01 previewed as
 * CGST 4.51 / SGST 4.50 against the 4.5050 / 4.5050 actually stored.
 */
export interface ComputedTotals {
  subtotal: string;
  taxPool: string;
  cgst: string;
  sgst: string;
  igst: string;
  total: string;
  intra: boolean;
}

export function lineAmount(quantity: string, rate: string): string {
  return roundDecimal(
    multiplyDecimals(toDecimalInput(quantity), toDecimalInput(rate)),
    2,
  );
}

export function computeTotals(
  items: NewBillFormValues["items"],
  supplierGstin: string,
  placeOfSupply: string,
  discount: string,
): ComputedTotals {
  const lines = items.map((it) => {
    const amount = lineAmount(it.quantity, it.rate);
    const tax = roundDecimal(
      divideDecimals(multiplyDecimals(amount, toDecimalInput(it.gstRate)), "100"),
      2,
    );
    return { amount, tax };
  });
  const subtotal = sumDecimals(lines.map((l) => l.amount));
  const taxPool = sumDecimals(lines.map((l) => l.tax));
  const supplierState =
    supplierGstin && supplierGstin.length >= 2 ? supplierGstin.slice(0, 2) : placeOfSupply;
  const placeState = placeOfSupply || supplierState;
  const intra = supplierState !== "" && supplierState === placeState;
  const halves = allocateDecimal(taxPool, ["1", "1"]);
  const cgst = intra ? halves[0] ?? "0.0000" : "0.0000";
  const sgst = intra ? halves[1] ?? "0.0000" : "0.0000";
  const igst = intra ? "0.0000" : taxPool;
  const total = subtractDecimals(
    addDecimals(subtotal, taxPool),
    roundDecimal(toDecimalInput(discount), 2),
  );
  return { subtotal, taxPool, cgst, sgst, igst, total, intra };
}
