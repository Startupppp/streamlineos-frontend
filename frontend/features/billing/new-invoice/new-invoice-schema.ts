import { z } from "zod";

export const GST_RATE_OPTIONS: readonly number[] = [0, 5, 12, 18, 28];

const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const lineItemSchema = z.object({
  description: z.string().min(1, "Description required"),
  hsnSacCode: z.string().optional(),
  quantity: z.number().positive("Qty must be > 0"),
  rate: z.number().nonnegative("Rate must be >= 0"),
  gstRate: z.number().refine((value) => GST_RATE_OPTIONS.includes(value), "Invalid GST rate"),
});

export const invoiceFormSchema = z
  .object({
    items: z.array(lineItemSchema).min(1, "Add at least one line item"),
    discount: z.number().min(0),
    currency: z.string().min(1),
    dueDate: z.string().optional(),
    notes: z.string().optional(),
    placeOfSupply: z.string().regex(/^\d{2}$/).optional().or(z.literal("")),
    customerGstin: z.string().regex(gstinRegex, "Invalid GSTIN").optional().or(z.literal("")),
    supplierGstin: z.string().regex(gstinRegex, "Invalid GSTIN").optional().or(z.literal("")),
    reverseCharge: z.boolean(),
  })
  .refine((value) => value.discount <= grossTotal(value.items), {
    message: "Discount cannot exceed the invoice subtotal plus tax",
    path: ["discount"],
  });

export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

export const DEFAULT_INVOICE_VALUES: InvoiceFormValues = {
  items: [{ description: "", hsnSacCode: "", quantity: 1, rate: 0, gstRate: 0 }],
  discount: 0,
  currency: "INR",
  dueDate: "",
  notes: "",
  placeOfSupply: "",
  customerGstin: "",
  supplierGstin: "",
  reverseCharge: false,
};

export const DEFAULT_LINE_ITEM: InvoiceFormValues["items"][number] = {
  description: "",
  hsnSacCode: "",
  quantity: 1,
  rate: 0,
  gstRate: 0,
};

export function grossTotal(items: InvoiceFormValues["items"]): number {
  return items.reduce((total, item) => {
    const amount = (Number(item.quantity) || 0) * (Number(item.rate) || 0);
    return total + amount + amount * ((Number(item.gstRate) || 0) / 100);
  }, 0);
}

/**
 * Re-exported so this module stays the form's single import surface. The rule
 * itself lives in ../invoice-money because the invoice detail screen's edit
 * dialog needs the same rounding and must not pull Zod in to get it.
 */
export { roundInvoiceAmount } from "../invoice-money";

export function formatInvoiceAmount(value: number): string {
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
