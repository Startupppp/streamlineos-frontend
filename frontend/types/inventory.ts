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
}

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
  quantityReceived: number;
  qualityStatus?: "ACCEPTED" | "REJECTED";
  rejectionReason?: string;
  lotNumber?: string;
  expiryDate?: string;
  manufactureDate?: string;
  serialNumbers?: string[];
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

