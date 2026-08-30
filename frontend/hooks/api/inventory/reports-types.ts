export type MovementType =
  | "PURCHASE"
  | "SALE"
  | "ADJUSTMENT_IN"
  | "ADJUSTMENT_OUT"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "RETURN_IN"
  | "RETURN_OUT"
  | "GRN";

export type ReorderUrgency = "critical" | "high" | "medium";

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface StockSummaryParams {
  page?: number;
  limit?: number;
}

export interface ReorderReportParams {
  page?: number;
  limit?: number;
}

export interface MovementsParams {
  warehouseId?: number;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface SlowMovingParams {
  days?: number;
  page?: number;
  limit?: number;
}

export interface ExpiryReportParams {
  withinDays?: number;
  warehouseId?: number;
  status?: string;
  page?: number;
  limit?: number;
}

export interface SlowMovingRow {
  productVariantId: number;
  variantSku: string;
  variantName: string;
  productName: string;
  onHand: number;
  averageCost: number;
  value: number;
  lastMovement: string | null;
  daysSinceLastMovement: number | null;
}

export interface ExpiryReportRow {
  id: number;
  lotNumber: string;
  expiryDate: string;
  status: string;
  productVariantId: number;
  variantSku: string;
  variantName: string;
  productName: string;
  totalOnHand: string;
  daysUntilExpiry: number;
}

export interface AiInsight {
  id: number;
  insightType: string;
  severity: string;
  title: string;
  body: string;
  status: "NEW" | "ACKNOWLEDGED" | "DISMISSED";
  createdAt: string;
}

export interface StockSummaryRow {
  productId: number;
  productName: string;
  sku: string;
  categoryName: string | null;
  uom: string | null;
  warehouseName: string | null;
  onHandQty: number;
  reservedQty: number;
  availableQty: number;
  reorderPoint: number | null;
  costPrice: string | null;
  totalValue: number;
}

export interface ReorderReportRow {
  productId: number;
  productName: string;
  sku: string;
  variantSku: string;
  categoryName: string | null;
  warehouseName: string | null;
  onHand: number;
  availableQty: number;
  reorderPoint: number;
  reorderQty: number | null;
  deficit: number;
  costPrice: string | null;
  vendorName: string | null;
  urgency: ReorderUrgency;
}

export interface MovementReportRow {
  id: number;
  type: MovementType;
  productName: string;
  sku: string;
  warehouseId: number | null;
  warehouseName: string | null;
  locationName: string | null;
  quantity: number;
  balanceAfter: number | null;
  referenceType: string | null;
  referenceNumber: string | null;
  notes: string | null;
  createdAt: string;
  performedBy: string | null;
}

export interface InventoryDashboardMovement {
  id: number;
  transactionType: MovementType;
  quantityChange: number;
  createdAt: string;
  notes: string | null;
  productName: string;
  sku: string;
  locationName: string | null;
  performedBy: string | null;
}

export interface InventoryDashboard {
  totalSkus: number;
  totalOnHand: number;
  totalCommitted: number;
  totalOnOrder: number;
  lowStockCount: number;
  draftPoCount: number;
  openSoCount: number;
  recentMovements: InventoryDashboardMovement[];
  stockValue: number;
  expiringLotsCount: number;
  qualityHoldQty: number;
  activeReservationsCount: number;
  openShipmentsCount: number;
  failedChannelSyncsCount: number;
  openInspectionsCount: number;
  recentInsights: AiInsight[];
}

export interface RawProductRef {
  id: number;
  name: string;
  sku: string;
  costPrice?: string | null;
  reorderPoint?: string | null;
  minStockLevel?: string | null;
}

export interface RawVariantRef {
  id: number;
  name: string;
  sku: string;
  costPrice: string | null;
  product: RawProductRef | null;
}

export interface RawWarehouseRef {
  id: number;
  name: string;
}

export interface RawLocationRef {
  id: number;
  name: string;
  code: string;
  warehouse?: RawWarehouseRef | null;
}

export interface RawUserRef {
  id: string;
  name: string;
}

export interface RawStockLevelRow {
  id: number;
  onHand: string;
  committed: string;
  onOrder: string;
  productVariant: RawVariantRef | null;
  location: RawLocationRef | null;
}

export interface RawTransactionRow {
  id: number;
  transactionType: MovementType;
  quantityChange: string;
  quantityAfter: string | null;
  referenceType: string | null;
  referenceId: string | null;
  notes: string | null;
  createdAt: string;
  productVariant: RawVariantRef | null;
  location: RawLocationRef | null;
  creator: RawUserRef | null;
}

export interface RawDashboardResponse {
  stockSummary: {
    totalSkus: number;
    totalOnHand: number;
    totalCommitted: number;
    totalOnOrder: number;
  } | null;
  lowStockCount: number;
  draftPoCount: number;
  openSoCount: number;
  recentMovements: RawTransactionRow[];
  stockValue?: number;
  expiringLotsCount?: number;
  qualityHoldQty?: number;
  activeReservationsCount?: number;
  openShipmentsCount?: number;
  failedChannelSyncsCount?: number;
  openInspectionsCount?: number;
  recentInsights?: AiInsight[];
}

export interface RawStockSummaryEnvelope {
  items: RawStockLevelRow[];
  total: number;
  page: number;
  totalPages: number;
}

export interface RawReorderRow {
  productVariantId: number;
  variantSku: string;
  variantName: string;
  productId: number;
  productName: string;
  productSku: string;
  onHand: number;
  onOrder: number;
  committed: number;
  reorderPoint: number;
  minStockLevel: number;
  reorderRuleId: number | null;
  minQty: number | null;
  maxQty: number | null;
  reorderQty: number | null;
  suggestedQty: number;
  vendorId: number | null;
  leadTimeDays: number | null;
}

export interface RawReorderEnvelope {
  items: RawReorderRow[];
  total: number;
  page: number;
  totalPages: number;
}

export interface RawMovementsEnvelope {
  items: RawTransactionRow[];
  total: number;
  page: number;
  totalPages: number;
}
