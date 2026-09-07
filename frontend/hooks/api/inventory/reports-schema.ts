import { z } from "zod";

export const dashboardContract = z.object({
  totalProducts: z.number().int(),
  totalVariants: z.number().int(),
  totalWarehouses: z.number().int(),
  totalLocations: z.number().int(),
  lowStockItems: z.number().int(),
  outOfStockItems: z.number().int(),
  totalStockValue: z.string(),
  pendingPOs: z.number().int(),
  pendingGRNs: z.number().int(),
  recentTransactions: z.array(z.object({
    id: z.number().int(),
    transactionType: z.string(),
    quantityChange: z.string(),
    createdAt: z.string(),
    productVariant: z.object({ id: z.number().int(), name: z.string(), sku: z.string() }).nullable(),
  })),
  stockAlerts: z.array(z.object({
    variantId: z.number().int(),
    variantSku: z.string(),
    variantName: z.string(),
    productId: z.number().int(),
    productName: z.string(),
    alertType: z.string(),
    onHand: z.string(),
    minStockLevel: z.string(),
    reorderPoint: z.string(),
  })),
});

export const stockSummaryContract = z.object({
  totalSkus: z.number().int(),
  totalOnHand: z.string(),
  totalCommitted: z.string(),
  totalAvailable: z.string(),
  totalValue: z.string(),
  byWarehouse: z.array(z.object({
    warehouseId: z.number().int(),
    warehouseName: z.string(),
    totalOnHand: z.string(),
    totalCommitted: z.string(),
    totalValue: z.string(),
  })),
  byCategory: z.array(z.object({
    categoryId: z.number().int().nullable(),
    categoryName: z.string().nullable(),
    totalSkus: z.number().int(),
    totalOnHand: z.string(),
    totalValue: z.string(),
  })),
});

const movementItemContract = z.object({
  productVariantId: z.number().int(),
  variantSku: z.string(),
  variantName: z.string(),
  productId: z.number().int(),
  productName: z.string(),
  openingStock: z.string(),
  receipts: z.string(),
  issues: z.string(),
  adjustments: z.string(),
  closingStock: z.string(),
  period: z.string().optional(),
});

export const movementsReportContract = z.object({
  items: z.array(movementItemContract),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});

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

export const valuationReportContract = z.object({
  items: z.array(valuationItemContract),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});

const slowMovingItemContract = z.object({
  productVariantId: z.number().int(),
  variantSku: z.string(),
  variantName: z.string(),
  productId: z.number().int(),
  productName: z.string(),
  onHand: z.string(),
  lastMovementDate: z.string().nullable(),
  daysSinceMovement: z.number().int().nullable(),
  totalValue: z.string().nullable(),
});

export const slowMovingReportContract = z.object({
  items: z.array(slowMovingItemContract),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});

const expiryItemContract = z.object({
  lotId: z.number().int(),
  lotNumber: z.string(),
  productVariantId: z.number().int(),
  variantSku: z.string(),
  variantName: z.string(),
  productName: z.string(),
  expiryDate: z.string().nullable(),
  daysUntilExpiry: z.number().int().nullable(),
  onHand: z.string(),
  locationId: z.number().int().nullable(),
  locationName: z.string().nullable(),
});

export const expiryReportContract = z.object({
  items: z.array(expiryItemContract),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});

const reorderItemContract = z.object({
  productVariantId: z.number().int(),
  variantSku: z.string(),
  variantName: z.string(),
  productId: z.number().int(),
  productName: z.string(),
  onHand: z.string(),
  reorderPoint: z.string(),
  minStockLevel: z.string(),
  maxStockLevel: z.string(),
  suggestedOrderQty: z.string().nullable(),
  defaultVendorId: z.number().int().nullable(),
  defaultVendorName: z.string().nullable(),
});

export const reorderReportContract = z.object({
  items: z.array(reorderItemContract),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});
