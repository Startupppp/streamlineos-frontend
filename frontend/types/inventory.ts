export type PurchaseOrderStatus = "DRAFT" | "SENT" | "PARTIAL" | "RECEIVED" | "CLOSED" | "CANCELLED";
export type ProductStatus = "ACTIVE" | "INACTIVE" | "DISCONTINUED";
export type ProductType = "STOCKABLE" | "CONSUMABLE" | "SERVICE";
export type TrackingMethod = "NONE" | "LOT" | "SERIAL";
export type CostingMethod = "STANDARD" | "WEIGHTED_AVERAGE" | "FIFO";

export interface InventoryCategory {
  id: number;
  orgId: string;
  name: string;
  parentCategoryId: number | null;
  description: string | null;
  isActive: boolean;
  children?: InventoryCategory[];
}

export interface InventoryUom {
  id: number;
  orgId: string;
  name: string;
  abbreviation: string;
  isActive: boolean;
  category?: string | null;
  ratioToBase?: string | null;
  roundingPrecision?: number | null;
  isBase?: boolean;
}

export interface InventoryProductVariant {
  id: number;
  orgId: string;
  productId: number;
  name: string;
  sku: string;
  barcode: string | null;
  costPrice: string;
  sellingPrice: string;
  attributeValues: Record<string, string> | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryProduct {
  id: number;
  orgId: string;
  name: string;
  sku: string;
  barcode: string | null;
  categoryId: number | null;
  uomId: number | null;
  description: string | null;
  status: ProductStatus;
  costPrice: string;
  sellingPrice: string;
  reorderPoint: string;
  minStockLevel: string;
  maxStockLevel: string;
  hasVariants: boolean;
  imageUrl: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  category?: InventoryCategory | null;
  uom?: InventoryUom | null;
  categoryName?: string | null;
  uomName?: string | null;
  isActive?: boolean;
  variants?: InventoryProductVariant[];
  totalStock?: number;
  productType?: ProductType | null;
  trackingMethod?: TrackingMethod | null;
  costingMethod?: CostingMethod | null;
  standardCost?: string | null;
  purchaseUomId?: number | null;
  salesUomId?: number | null;
  defaultVendorId?: number | null;
  reorderEnabled?: boolean;
  /**
   * B1 — the materials pack's catalogue attributes.
   *
   * Every one is optional because the server **strips them from the response**
   * when the pack is off — not nulls, absent. A client that treated a missing
   * `brand` as "no brand" would be reading a pack gate as data.
   */
  brand?: string | null;
  materialGrade?: string | null;
  finish?: string | null;
  colour?: string | null;
  dimensionLabel?: string | null;
  materialFamily?: MaterialFamily | null;
  packSize?: string | null;
  supplierCode?: string | null;
  leadTimeDays?: number | null;
  reorderQuantity?: string | null;
}

export interface CreateProductInput {
  name: string;
  sku?: string;
  barcode?: string;
  categoryId?: number;
  uomId?: number;
  description?: string;
  status?: ProductStatus;
  costPrice?: number;
  sellingPrice?: number;
  reorderPoint?: number;
  hasVariants?: boolean;
  productType?: ProductType;
  trackingMethod?: TrackingMethod;
  costingMethod?: CostingMethod;
  standardCost?: string;
  purchaseUomId?: number;
  salesUomId?: number;
  defaultVendorId?: number;
  reorderEnabled?: boolean;
  /**
   * B1 — the construction and interior-materials fields, behind the `materials`
   * pack. The server refuses every one of them while the pack is off, so a
   * caller that sends them without the pack gets a named 400 rather than a
   * silent write.
   *
   * `null` clears a value; `undefined` leaves it alone. Quantities are strings
   * for the same reason they are strings everywhere else in this module: a
   * decimal that goes through a JSON float has already lost precision.
   */
  brand?: string | null;
  materialGrade?: string | null;
  finish?: string | null;
  colour?: string | null;
  dimensionLabel?: string | null;
  materialFamily?: MaterialFamily | null;
  packSize?: string | null;
  supplierCode?: string | null;
  leadTimeDays?: number | null;
  reorderQuantity?: string | null;
}

/** B1 — the closed set of material families the catalogue splits on. */
export type MaterialFamily =
  | "CEMENT_AGGREGATE" | "STEEL_REBAR" | "BRICK_BLOCK" | "TILE_STONE" | "PAINT_COATING"
  | "PLUMBING" | "ELECTRICAL" | "SANITARYWARE" | "WOOD_PANEL" | "GLASS_MIRROR"
  | "HARDWARE_FASTENER" | "ADHESIVE_CHEMICAL" | "FALSE_CEILING" | "LIGHTING" | "OTHER";

export type UpdateProductInput = Omit<Partial<CreateProductInput>, "categoryId" | "uomId" | "barcode" | "description"> & {
  productId?: number;
  categoryId?: number | null;
  uomId?: number | null;
  barcode?: string | null;
  description?: string | null;
};

export interface CreateProductVariantInput {
  name: string;
  sku: string;
  barcode?: string;
  costPrice?: number;
  sellingPrice?: number;
  attributeValues?: Record<string, string>;
}

export interface InventoryVendor {
  id: number;
  orgId: string;
  clientId: number | null;
  name: string;
  code: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  gstin: string | null;
  leadTimeDays: number;
  paymentTermsDays: number;
  currency: string;
  isActive: boolean;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariantFlat {
  id: number;
  productId: number;
  productName: string;
  name: string;
  sku: string;
  costPrice: string;
  isActive: boolean;
}

export interface PurchaseOrderLine {
  id: number;
  poId: number;
  productVariantId: number;
  quantity: string;
  quantityReceived: string;
  unitCost: string;
  taxRate: string;
  amount: string;
  lineOrder: number;
  productVariant?: {
    id: number;
    name: string;
    sku: string;
    product?: { id: number; name: string; trackingMethod?: TrackingMethod | null };
  };
}

export interface GoodsReceiptLine {
  id: number;
  grnId: number;
  poLineId: number;
  quantityReceived: string;
  qualityStatus: "ACCEPTED" | "REJECTED";
  rejectionReason: string | null;
  lotNumber: string | null;
  expiryDate: string | null;
  manufactureDate: string | null;
  serialNumbers: string[] | null;
  productVariant?: { id: number; name: string; sku: string };
}

/** B1. Nothing but POSTED has stock behind it. */
export type GoodsReceiptStatus = "DRAFT" | "COUNTING" | "QUALITY_REVIEW" | "POSTED" | "CANCELLED";

export interface GoodsReceiptNote {
  id: number;
  orgId: string;
  poId: number;
  grnNumber: string;
  status: GoodsReceiptStatus;
  receivedDate: string;
  locationId: number | null;
  notes: string | null;
  postedAt: string | null;
  createdBy: string;
  createdAt: string;
  creator?: { id: string; name: string };
  lines: GoodsReceiptLine[];
}

export interface PurchaseOrder {
  id: number;
  orgId: string;
  vendorId: number;
  poNumber: string;
  status: PurchaseOrderStatus;
  orderDate: string;
  expectedDeliveryDate: string | null;
  warehouseId: number | null;
  subtotal: string;
  taxAmount: string;
  discount: string;
  total: string;
  currency: string;
  notes: string | null;
  sentAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  vendor?: { id: number; name: string; code: string };
  warehouse?: { id: number; name: string; code?: string } | null;
  creator?: { id: string; name: string };
  lines: PurchaseOrderLine[];
  grns: GoodsReceiptNote[];
}

export interface PurchaseOrderSummary {
  id: number;
  poNumber: string;
  vendorId: number;
  status: PurchaseOrderStatus;
  orderDate: string;
  expectedDeliveryDate: string | null;
  total: string;
  currency: string;
  vendor?: { id: number; name: string; code: string };
}

export interface CreateVendorInput {
  name: string;
  code?: string;
  email?: string;
  phone?: string;
  address?: string;
  gstin?: string;
  leadTimeDays?: number;
  paymentTermsDays?: number;
  currency?: string;
  notes?: string;
}

export interface UpdateVendorInput extends Partial<CreateVendorInput> {
  isActive?: boolean;
}

export interface CreatePoLineInput {
  productVariantId: number;
  quantity: number;
  unitCost: number;
  taxRate?: number;
  lineOrder?: number;
}

export interface CreatePurchaseOrderInput {
  vendorId: number;
  orderDate: string;
  expectedDeliveryDate?: string;
  warehouseId?: number;
  currency?: string;
  notes?: string;
  lines: CreatePoLineInput[];
}

export interface ReceiveGoodsLineInput {
  poLineId: number;
  /** Decimal string at scale 4 — this becomes a stock ledger row. */
  quantityReceived: string;
  /** Why the line did not match what the order still owed. */
  discrepancyReason?: "SHORT" | "OVER" | "DAMAGED" | "WRONG_ITEM";
  qualityStatus?: "ACCEPTED" | "REJECTED";
  rejectionReason?: string;
  lotNumber?: string;
  expiryDate?: string;
  manufactureDate?: string;
  serialNumbers?: string[];
}

/**
 * C4. A supplier rate never travels without the sample it rests on.
 *
 * `percent` is a decimal string the backend already rounded, and null when the
 * denominator was zero — "nothing to measure" and "zero percent" are opposite
 * claims about a vendor, and rendering both as 0.0% says the worst supplier on
 * the list is flawless.
 */
export interface ScorecardRate {
  percent: string | null;
  numerator: string;
  denominator: string;
  sampleSize: number;
  sufficient: boolean;
}

export interface VendorScorecard {
  vendorId: number;
  leadTime: {
    observations: number;
    meanDays: number;
    stdDevDays: number;
    p50Days: number;
    p90Days: number;
    reliable: boolean;
    note?: string;
  };
  onTime: ScorecardRate;
  lineFill: ScorecardRate;
  unitFill: ScorecardRate;
  returns: ScorecardRate;
  rejection: ScorecardRate;
  discrepancy: ScorecardRate;
  openPoCount: number;
  spend: {
    amount: string;
    currency: string;
    excludedCurrencies: string[];
  };
  notes: string[];
}

/** One purchase order behind the rates, with the receipts that settled it. */
export interface VendorDelivery {
  poId: number;
  poNumber: string;
  status: PurchaseOrderStatus;
  orderDate: string;
  expectedDeliveryDate: string | null;
  firstReceiptDate: string | null;
  daysToReceive: number | null;
  onTime: boolean | null;
  orderedQty: string;
  receivedQty: string;
  lines: number;
  linesInFull: number;
  receiptCount: number;
  receiptIds: number[];
  total: string;
  currency: string;
}

export interface VendorDeliveriesResponse {
  items: VendorDelivery[];
  total: number;
  page: number;
  totalPages: number;
}

export interface WarehouseStockRow {
  locationId: number;
  locationCode: string;
  locationName: string;
  productVariantId: number;
  variantSku: string;
  variantName: string;
  productId: number;
  productName: string;
  onHand: number;
  committed: number;
  onOrder: number;
}

export interface WarehouseStockResult {
  items: WarehouseStockRow[];
  total: number;
  page: number;
  totalPages: number;
}

export interface AdjustmentDetailLine {
  id: number;
  productVariantId: number;
  locationId: number;
  quantityChange: number;
  variantName?: string | null;
  variantSku?: string | null;
  locationName?: string | null;
  notes?: string | null;
}

export interface AdjustmentDetail {
  id: number;
  referenceNumber: string;
  reason: string;
  status: "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "POSTED" | "CANCELLED";
  notes: string | null;
  createdAt: string;
  approvedAt?: string | null;
  postedAt?: string | null;
  createdByName?: string | null;
  scrapLocationId?: number | null;
  scrapLocation?: { id: number; name: string; code: string } | null;
  /**
   * D8. What the write-off cost, from the layers the issue consumed. Absent —
   * not null — for a caller without `inventory:valuation:read`: the backend
   * omits the field rather than blanking it, so `undefined` means "not allowed
   * to know" and `null` means "not posted yet".
   */
  writtenOffValue?: string | null;
  lines: AdjustmentDetailLine[];
}

export interface CreateUomInput {
  name: string;
  abbreviation: string;
  category?: string;
  ratioToBase?: string;
  roundingPrecision?: number;
  isBase?: boolean;
}

export interface ReceiveGoodsInput {
  locationId: number;
  receivedDate: string;
  notes?: string;
  lines: ReceiveGoodsLineInput[];
}

export type StockReservationStatus = "ACTIVE" | "CONSUMED" | "RELEASED" | "EXPIRED";

export interface StockAvailabilityByWarehouse {
  warehouse_id: number;
  warehouse_name: string;
  on_hand: string;
  committed: string;
  available: string;
}

export interface StockAvailability {
  variantId: number;
  onHand: string;
  available: string;
  committed: string;
  incoming: string;
  outgoing: string;
  forecasted: string;
  warehouseBreakdown: StockAvailabilityByWarehouse[];
}

export interface StockReservation {
  id: number;
  orgId: string;
  sourceType: string;
  sourceId: string;
  sourceLineId: string | null;
  productVariantId: number;
  warehouseId: number | null;
  locationId: number | null;
  lotId: number | null;
  serialId: number | null;
  reservedQty: string;
  status: StockReservationStatus;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  productVariant: { id: number; sku: string; name: string | null } | null;
  location: { id: number; name: string; code: string } | null;
  warehouse: { id: number; name: string } | null;
}

