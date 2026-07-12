import { z } from "zod";

export const GST_RATES = ["0", "5", "12", "18", "28"] as const;

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

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface ComputedTotals {
  subtotal: number;
  taxPool: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  intra: boolean;
}

export function computeTotals(
  items: NewBillFormValues["items"],
  supplierGstin: string,
  placeOfSupply: string,
  discount: string,
): ComputedTotals {
  const lines = items.map((it) => {
    const qty = num(it.quantity);
    const rate = num(it.rate);
    const gstRate = num(it.gstRate);
    const amount = round2(qty * rate);
    const tax = round2(amount * (gstRate / 100));
    return { amount, tax };
  });
  const subtotal = round2(lines.reduce((acc, l) => acc + l.amount, 0));
  const taxPool = round2(lines.reduce((acc, l) => acc + l.tax, 0));
  const supplierState =
    supplierGstin && supplierGstin.length >= 2
      ? supplierGstin.slice(0, 2)
      : placeOfSupply;
  const placeState = placeOfSupply || supplierState;
  const intra = supplierState !== "" && supplierState === placeState;
  const cgst = intra ? round2(taxPool / 2) : 0;
  const sgst = intra ? round2(taxPool - cgst) : 0;
  const igst = intra ? 0 : taxPool;
  const total = round2(subtotal + taxPool - num(discount));
  return { subtotal, taxPool, cgst, sgst, igst, total, intra };
}
