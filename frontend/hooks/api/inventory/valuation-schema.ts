import { z } from "zod";

const inventoryPeriodContract = z.object({
  periodId: z.string(),
  name: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  status: z.string(),
});

const valuationGrainContract = z.object({
  asOfDate: z.string(),
  live: z.boolean(),
  period: inventoryPeriodContract.nullable(),
});

const valuationSummaryRowContract = z.object({
  productVariantId: z.number().int(),
  variantSku: z.string(),
  variantName: z.string().nullable(),
  productId: z.number().int(),
  productName: z.string(),
  costingMethod: z.string(),
  onHand: z.string(),
  value: z.string(),
  fifoValue: z.string(),
  standardCost: z.string(),
  unitCostBasis: z.string(),
  layerCount: z.number().int(),
});

export const valuationReportContract = z.object({
  grain: valuationGrainContract,
  items: z.array(valuationSummaryRowContract),
  totalValue: z.string(),
  totalOnHand: z.string(),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});

const costingVariantContract = z.object({
  id: z.number().int(),
  productId: z.number().int(),
  productName: z.string(),
  name: z.string(),
  sku: z.string(),
  costPrice: z.string().optional(),
  isActive: z.boolean(),
});

export const costingVariantsContract = z.object({
  items: z.array(costingVariantContract),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  totalPages: z.number().int(),
});

export type ValuationGrain = z.infer<typeof valuationGrainContract>;
export type InventoryPeriod = z.infer<typeof inventoryPeriodContract>;
export type ValuationRow = z.infer<typeof valuationSummaryRowContract>;
export type ValuationReport = z.infer<typeof valuationReportContract>;
export type CostingVariant = z.infer<typeof costingVariantContract>;
export type CostingVariants = z.infer<typeof costingVariantsContract>;
