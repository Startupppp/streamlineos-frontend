import { z } from "zod";

const userRefContract = z.object({
  id: z.string(),
  name: z.string().nullable(),
});

const productRefContract = z.object({
  id: z.number().int(),
  name: z.string(),
  sku: z.string(),
});

const locationRefContract = z.object({
  id: z.number().int(),
  name: z.string(),
  code: z.string(),
  warehouse: z.object({ id: z.number().int(), name: z.string() }).optional(),
});

const stockLevelItemContract = z.object({
  id: z.number().int(),
  org_id: z.string(),
  product_variant_id: z.number().int(),
  location_id: z.number().int(),
  lot_id: z.number().int().nullable(),
  serial_id: z.number().int().nullable(),
  on_hand: z.string(),
  committed: z.string(),
  on_order: z.string(),
  blocked_qty: z.string().nullable(),
  quality_hold_qty: z.string().nullable(),
  outgoing_qty: z.string().nullable(),
  average_cost: z.string().nullable().optional(),
  updated_at: z.string(),
  available: z.string(),
  productVariant: z.object({
    id: z.number().int(),
    name: z.string().nullable(),
    sku: z.string().nullable(),
    product: z.object({
      id: z.number().int(),
      name: z.string(),
      sku: z.string(),
      reorderPoint: z.string().nullable(),
    }).nullable().optional(),
  }).nullable().optional(),
  location: z.object({
    id: z.number().int(),
    name: z.string(),
    code: z.string(),
    warehouse: z.object({ id: z.number().int(), name: z.string() }).nullable().optional(),
  }).nullable().optional(),
});

export const listStockLevelsContract = z.object({
  items: z.array(stockLevelItemContract),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});

const stockTransactionItemContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  productVariantId: z.number().int(),
  locationId: z.number().int().nullable(),
  transactionType: z.enum([
    "PURCHASE", "SALE", "ADJUSTMENT_IN", "ADJUSTMENT_OUT",
    "TRANSFER_IN", "TRANSFER_OUT", "RETURN_IN", "RETURN_OUT",
    "GRN", "OPENING_BALANCE", "VENDOR_RETURN", "CUSTOMER_RETURN",
    "CYCLE_COUNT_GAIN", "CYCLE_COUNT_LOSS", "SCRAP",
    "QUARANTINE_IN", "QUARANTINE_OUT",
    "RESERVATION_CREATE", "RESERVATION_RELEASE", "RESERVATION_CONSUME",
  ]),
  quantityChange: z.string(),
  quantityBefore: z.string(),
  quantityAfter: z.string(),
  lotId: z.number().int().nullable(),
  serialId: z.number().int().nullable(),
  unitCost: z.string().nullable().optional(),
  totalCost: z.string().nullable().optional(),
  idempotencyKey: z.string().nullable(),
  postingDate: z.string().nullable(),
  reason: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  referenceType: z.string().nullable(),
  referenceId: z.string().nullable(),
  notes: z.string().nullable(),
  createdBy: z.string(),
  createdByMembershipId: z.number().int().nullable(),
  createdAt: z.string(),
  productVariant: z.object({
    id: z.number().int(),
    orgId: z.string(),
    productId: z.number().int(),
    name: z.string(),
    sku: z.string(),
    barcode: z.string().nullable(),
    costPrice: z.string().optional(),
    sellingPrice: z.string(),
    attributeValues: z.record(z.string(), z.string()),
    isActive: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
    product: productRefContract,
  }).nullable(),
  location: locationRefContract.nullable(),
  creator: userRefContract.nullable(),
});

export const listStockTransactionsContract = z.object({
  items: z.array(stockTransactionItemContract),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});

export const stockAvailabilityContract = z.object({
  variantId: z.number().int(),
  onHand: z.string(),
  available: z.string(),
  committed: z.string(),
  incoming: z.string(),
  outgoing: z.string(),
  forecasted: z.string(),
  warehouseBreakdown: z.array(z.object({
    warehouse_id: z.number().int(),
    warehouse_name: z.string(),
    on_hand: z.string(),
    committed: z.string(),
    available: z.string(),
  })),
});

const adjustmentLineContract = z.object({
  id: z.number().int(),
  adjustmentId: z.number().int(),
  productVariantId: z.number().int(),
  locationId: z.number().int(),
  quantityChange: z.string(),
  uomId: z.number().int().nullable(),
  quantityEntered: z.string().nullable(),
  notes: z.string().nullable(),
  productVariant: z.object({
    id: z.number().int(),
    name: z.string(),
    sku: z.string(),
    product: productRefContract,
  }).optional(),
  location: z.object({ id: z.number().int(), name: z.string(), code: z.string() }).optional(),
});

const adjustmentItemContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  referenceNumber: z.string(),
  reason: z.string(),
  notes: z.string().nullable(),
  status: z.string(),
  approvedBy: z.string().nullable(),
  approvedByMembershipId: z.number().int().nullable(),
  approvedAt: z.string().nullable(),
  postedBy: z.string().nullable(),
  postedByMembershipId: z.number().int().nullable(),
  postedAt: z.string().nullable(),
  createdBy: z.string(),
  createdByMembershipId: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  creator: userRefContract.optional(),
  approver: userRefContract.nullable().optional(),
  poster: userRefContract.nullable().optional(),
  lines: z.array(adjustmentLineContract).optional(),
});

export const listAdjustmentsContract = z.object({
  items: z.array(adjustmentItemContract),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});

export const getAdjustmentContract = adjustmentItemContract;

const transferLineContract = z.object({
  id: z.number().int(),
  transferId: z.number().int(),
  productVariantId: z.number().int(),
  quantity: z.string(),
  quantityReceived: z.string(),
  uomId: z.number().int().nullable(),
  quantityEntered: z.string().nullable(),
  dispatchedUnitCost: z.string().nullable().optional(),
  lotId: z.number().int().nullable(),
  serialId: z.number().int().nullable(),
  notes: z.string().nullable(),
  productVariant: z.object({
    id: z.number().int(),
    name: z.string().nullable(),
    sku: z.string().nullable(),
    product: z.object({ id: z.number().int(), name: z.string(), sku: z.string() }).nullable().optional(),
  }).nullable().optional(),
  lot: z.object({ id: z.number().int(), lotNumber: z.string() }).nullable().optional(),
  serial: z.object({ id: z.number().int(), serialNumber: z.string() }).nullable().optional(),
});

export const transferItemContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  referenceNumber: z.string(),
  fromLocationId: z.number().int(),
  toLocationId: z.number().int(),
  fromWarehouseId: z.number().int().nullable(),
  toWarehouseId: z.number().int().nullable(),
  status: z.enum(["PENDING", "RESERVED", "IN_TRANSIT", "COMPLETED", "CANCELLED"]),
  notes: z.string().nullable(),
  reservedAt: z.string().nullable(),
  dispatchedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  createdBy: z.string(),
  createdByMembershipId: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  lines: z.array(transferLineContract).optional(),
  fromLocation: z.object({ id: z.number().int(), name: z.string(), code: z.string() }).optional(),
  toLocation: z.object({ id: z.number().int(), name: z.string(), code: z.string() }).optional(),
  creator: userRefContract.optional(),
});

export const listTransfersContract = z.object({
  items: z.array(transferItemContract),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});

const reservationItemContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  sourceType: z.string(),
  sourceId: z.string(),
  sourceLineId: z.string().nullable(),
  productVariantId: z.number().int(),
  warehouseId: z.number().int().nullable(),
  locationId: z.number().int().nullable(),
  lotId: z.number().int().nullable(),
  serialId: z.number().int().nullable(),
  reservedQty: z.string(),
  status: z.string(),
  idempotencyKey: z.string().nullable(),
  expiresAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  productVariant: z.object({ id: z.number().int(), name: z.string(), sku: z.string() }).optional(),
  location: z.object({ id: z.number().int(), name: z.string(), code: z.string() }).optional(),
  warehouse: z.object({ id: z.number().int(), name: z.string() }).optional(),
});

export const listReservationsContract = z.object({
  items: z.array(reservationItemContract),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});

export const createReservationContract = reservationItemContract;

export const stockEngineResultContract = z.object({
  transactionIds: z.array(z.number().int()),
  levels: z.array(z.object({
    productVariantId: z.number().int(),
    locationId: z.number().int(),
    onHand: z.string(),
  })),
});
