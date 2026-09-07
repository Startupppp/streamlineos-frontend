import { z } from "zod";

const dashboardMovementContract = z.object({
  id: z.number().int(),
  transactionType: z.string(),
  quantityChange: z.string(),
  quantityAfter: z.string().nullable(),
  referenceType: z.string().nullable(),
  referenceId: z.string().nullable(),
  createdAt: z.string(),
  productVariant: z.object({
    id: z.number().int(),
    name: z.string(),
    sku: z.string(),
    product: z.object({ id: z.number().int(), name: z.string(), sku: z.string() }).optional(),
  }).optional(),
  location: z.object({ id: z.number().int(), name: z.string() }).optional(),
  creator: z.object({ id: z.string(), name: z.string().nullable() }).optional(),
});

const dashboardInsightContract = z.object({
  id: z.number().int(),
  insightType: z.string(),
  severity: z.string(),
  title: z.string(),
  body: z.string(),
  status: z.enum(["NEW", "ACKNOWLEDGED", "DISMISSED"]),
  createdAt: z.string(),
});

export const dashboardContract = z.object({
  stockSummary: z.object({
    totalSkus: z.number().int(),
    totalOnHand: z.string(),
    totalCommitted: z.string(),
    totalOnOrder: z.string(),
  }).nullable().optional(),
  lowStockCount: z.number().int(),
  draftPoCount: z.number().int(),
  openSoCount: z.number().int(),
  recentMovements: z.array(dashboardMovementContract),
  stockValue: z.number().optional(),
  expiringLotsCount: z.number().int().optional(),
  qualityHoldQty: z.number().optional(),
  activeReservationsCount: z.number().int().optional(),
  openShipmentsCount: z.number().int().optional(),
  failedChannelSyncsCount: z.number().int().optional(),
  openInspectionsCount: z.number().int().optional(),
  recentInsights: z.array(dashboardInsightContract).optional(),
});

export const stockSummaryContract = z.object({
  items: z.array(z.object({
    productVariantId: z.number().int(),
    variantSku: z.string(),
    variantName: z.string(),
    productId: z.number().int(),
    productName: z.string(),
    onHand: z.string(),
    committed: z.string(),
    available: z.string(),
    onOrder: z.string(),
    averageCost: z.string().nullable().optional(),
    totalValue: z.number().optional(),
    reorderPoint: z.string().nullable().optional(),
    isLowStock: z.boolean().optional(),
  })),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});

const movementItemContract = z.object({
  id: z.number().int(),
  transactionType: z.string(),
  quantityChange: z.string(),
  createdAt: z.string(),
  productVariantId: z.number().int().optional(),
  variantSku: z.string().optional(),
  variantName: z.string().optional(),
});

export const movementsReportContract = z.object({
  items: z.array(movementItemContract),
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
  totalOnHand: z.string(),
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
  suggestedQty: z.number().optional(),
  vendorId: z.number().int().nullable().optional(),
  vendorName: z.string().nullable().optional(),
});

export const reorderReportContract = z.object({
  items: z.array(reorderItemContract),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});
