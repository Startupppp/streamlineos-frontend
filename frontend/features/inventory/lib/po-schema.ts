import { z } from "zod";

export const poLineSchema = z.object({
  variantId: z.string(),
  quantity: z.string(),
  unitCost: z.string(),
  taxRate: z.string(),
});

export const newPoSchema = z.object({
  vendorId: z.string().min(1, "Vendor is required"),
  orderDate: z.string().min(1, "Order date is required"),
  expectedDeliveryDate: z.string(),
  notes: z.string(),
  lines: z.array(poLineSchema),
});

export type NewPoFormValues = z.infer<typeof newPoSchema>;

export const poEditLineSchema = z.object({
  variantId: z.string().min(1, "Select a variant"),
  quantity: z.string().min(1),
  unitCost: z.string().min(1),
  taxRate: z.string(),
});

export const poEditSchema = z.object({
  vendorId: z.string().min(1, "Vendor is required"),
  orderDate: z.string().min(1, "Required"),
  expectedDeliveryDate: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(poEditLineSchema).min(1),
});

export type PoEditFormValues = z.infer<typeof poEditSchema>;
