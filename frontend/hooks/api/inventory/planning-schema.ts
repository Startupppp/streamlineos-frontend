import { z } from "zod";

const ruleWithRelationsContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  productVariantId: z.number().int(),
  warehouseId: z.number().int().nullable(),
  minQty: z.string(),
  maxQty: z.string().nullable(),
  reorderQty: z.string().nullable(),
  vendorId: z.number().int().nullable(),
  leadTimeDays: z.number().int().nullable(),
  safetyStock: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  productVariant: z.object({
    id: z.number().int(),
    name: z.string(),
    sku: z.string(),
    product: z.object({ id: z.number().int(), name: z.string(), sku: z.string() }),
  }),
  warehouse: z.object({ id: z.number().int(), name: z.string() }).nullable(),
});

export const listRulesContract = z.object({
  items: z.array(ruleWithRelationsContract),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});

export const ruleDetailContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  productVariantId: z.number().int(),
  warehouseId: z.number().int().nullable(),
  minQty: z.string(),
  maxQty: z.string().nullable(),
  reorderQty: z.string().nullable(),
  vendorId: z.number().int().nullable(),
  leadTimeDays: z.number().int().nullable(),
  safetyStock: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const suggestionItemContract = z.object({
  productVariantId: z.number().int(),
  variantSku: z.string(),
  variantName: z.string(),
  productName: z.string(),
  ruleId: z.number().int(),
  warehouseId: z.number().int().nullable(),
  warehouseName: z.string().nullable(),
  currentOnHand: z.number(),
  forecasted: z.number(),
  suggestedQty: z.number(),
  vendorId: z.number().int().nullable(),
  leadTimeDays: z.number().int(),
  expectedDate: z.string(),
  reason: z.string(),
});

export const listSuggestionsContract = z.object({
  items: z.array(suggestionItemContract),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});

const projectedWeekContract = z.object({
  week: z.number().int(),
  projectedDemand: z.number(),
  projectedStock: z.number(),
});

const forecastItemContract = z.object({
  variantId: z.number().int(),
  variantSku: z.string(),
  variantName: z.string(),
  productName: z.string(),
  onHand: z.number(),
  onOrder: z.number(),
  avgWeeklyDemand: z.number(),
  weeksOfStock: z.number().nullable(),
  stockoutRisk: z.string(),
  projectedWeeks: z.array(projectedWeekContract),
});

export const listForecastingContract = z.object({
  items: z.array(forecastItemContract),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});
