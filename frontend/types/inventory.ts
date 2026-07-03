export type PurchaseOrderStatus = "DRAFT" | "SENT" | "PARTIAL" | "RECEIVED" | "CLOSED" | "CANCELLED";
export type ProductStatus = "ACTIVE" | "INACTIVE" | "DISCONTINUED";

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
}

export interface CreateProductInput {
  name: string;
  sku: string;
  barcode?: string;
  categoryId?: number;
  uomId?: number;
  description?: string;
  status?: ProductStatus;
  costPrice?: number;
  sellingPrice?: number;
  reorderPoint?: number;
  hasVariants?: boolean;
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

export interface UpdateProductVariantInput extends Partial<CreateProductVariantInput> {
  isActive?: boolean;
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
    product?: { id: number; name: string };
  };
}

export interface GoodsReceiptLine {
  id: number;
  grnId: number;
  poLineId: number;
  quantityReceived: string;
  qualityStatus: "ACCEPTED" | "REJECTED";
  rejectionReason: string | null;
}

export interface GoodsReceiptNote {
  id: number;
  orgId: string;
  poId: number;
  grnNumber: string;
  receivedDate: string;
  locationId: number | null;
  notes: string | null;
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
  quantityReceived: number;
  qualityStatus?: "ACCEPTED" | "REJECTED";
  rejectionReason?: string;
}

export interface ReceiveGoodsInput {
  locationId: number;
  notes?: string;
  lines: ReceiveGoodsLineInput[];
}
