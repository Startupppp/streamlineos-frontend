import { z } from "zod";

const crmProductSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  sku: z.string().nullable(),
  category: z.string().nullable(),
  unitPrice: z.number().int(),
  currency: z.string(),
  taxRate: z.number().int(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const crmProductsListContract = z.object({
  products: z.array(crmProductSchema),
  total: z.number().int(),
});

export const crmProductContract = crmProductSchema;

export const deleteProductContract = z.object({ success: z.boolean() });
