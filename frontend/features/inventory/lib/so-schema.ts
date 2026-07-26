import { z } from "zod";

export const soLineSchema = z.object({
  variantId: z.string().min(1, "Select a product variant"),
  quantity: z.string().refine(
    (v) => { const n = parseFloat(v); return Number.isFinite(n) && n > 0; },
    { message: "Quantity must be greater than 0" },
  ),
  unitPrice: z.string().refine(
    (v) => { const n = parseFloat(v); return Number.isFinite(n) && n >= 0; },
    { message: "Unit price must be 0 or greater" },
  ),
  taxRate: z.string().refine(
    (v) => { const n = parseFloat(v); return !v || (Number.isFinite(n) && n >= 0 && n <= 100); },
    { message: "Tax rate must be between 0 and 100" },
  ),
});

export const newSoSchema = z.object({
  customerId: z.string().optional(),
  warehouseId: z.string().min(1, "Warehouse is required"),
  orderDate: z.string().min(1, "Order date is required"),
  expectedShipDate: z.string().optional(),
  currency: z.string().min(1, "Currency is required").max(3, "Currency must be 3 characters"),
  shippingAddress: z.string().max(500, "Address must be at most 500 characters").optional(),
  notes: z.string().max(2000, "Notes must be at most 2000 characters").optional(),
  lines: z.array(soLineSchema).min(1, "Add at least one line item"),
});

export type NewSoFormValues = z.infer<typeof newSoSchema>;

export const soEditLineSchema = z.object({
  variantId: z.string().min(1, "Select a variant"),
  quantity: z.string().min(1),
  unitPrice: z.string().min(1),
  taxRate: z.string(),
});

export const soEditSchema = z.object({
  orderDate: z.string().min(1, "Required"),
  requiredDate: z.string().optional(),
  warehouseId: z.string().optional(),
  currency: z.string(),
  shippingAddress: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(soEditLineSchema).min(1),
});

export type SoEditFormValues = z.infer<typeof soEditSchema>;
