import { z } from "zod";

const valuationItemContract = z.object({
  productVariantId: z.number().int(),
  variantSku: z.string(),
  variantName: z.string(),
  productId: z.number().int(),
  productName: z.string(),
  costingMethod: z.string().nullable(),
  onHand: z.string(),
  averageCost: z.string().nullable(),
  totalValue: z.string(),
});

export const valuationSummaryContract = z.object({
  items: z.array(valuationItemContract),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
  totalValue: z.string().optional(),
});

const layerContract = z.object({
  id: z.number().int(),
  productVariantId: z.number().int(),
  costingMethod: z.string(),
  quantity: z.string(),
  unitCost: z.string(),
  totalValue: z.string(),
  remainingQuantity: z.string(),
  sourceType: z.string().nullable(),
  sourceId: z.string().nullable(),
  createdAt: z.string(),
});

export const valuationLayersContract = z.object({
  items: z.array(layerContract),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});
