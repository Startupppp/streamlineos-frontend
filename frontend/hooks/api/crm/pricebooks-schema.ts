import { z } from "zod";

const pricebookSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  currency: z.string(),
  isDefault: z.boolean(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const pricebooksListContract = z.array(pricebookSchema);
export const pricebookContract = pricebookSchema;

const pricebookEntryWithProductSchema = z.object({
  id: z.string(),
  pricebookId: z.string(),
  productId: z.number().int(),
  unitPriceCents: z.number().int(),
  minQuantity: z.number().int(),
  productName: z.string().nullable(),
  productSku: z.string().nullable(),
  productCurrency: z.string().nullable(),
});

export const pricebookEntriesListContract = z.array(pricebookEntryWithProductSchema);

const pricebookEntrySchema = z.object({
  id: z.string(),
  orgId: z.string(),
  pricebookId: z.string(),
  productId: z.number().int(),
  unitPriceCents: z.number().int(),
  minQuantity: z.number().int(),
  productName: z.string().nullable(),
  productSku: z.string().nullable(),
  productCurrency: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const pricebookEntryContract = pricebookEntrySchema;

export const resolvePriceContract = z.object({
  unitPriceCents: z.number().int(),
  source: z.enum(["pricebook", "product"]),
  pricebookName: z.string().nullable(),
});

export const quoteSettingsContract = z.object({
  id: z.string().optional(),
  orgId: z.string().optional(),
  maxDiscountPercent: z.number().int().nullable(),
  requirePricebookPrice: z.boolean(),
  defaultExpiryDays: z.number().int(),
  allowPriceOverride: z.boolean(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

const quoteTemplateSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  name: z.string(),
  isDefault: z.boolean(),
  branding: z.record(z.string(), z.unknown()).nullable(),
  terms: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const quoteTemplatesListContract = z.array(quoteTemplateSchema);
export const quoteTemplateContract = quoteTemplateSchema;

export const deletePricebookContract = z.object({ success: z.boolean() });
