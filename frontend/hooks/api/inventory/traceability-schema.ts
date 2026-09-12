import { z } from "zod";
import type { LotStatus, SerialStatus } from "@/features/inventory/lib";

const lotStatusContract: z.ZodType<LotStatus> = z.enum([
  "ACTIVE",
  "EXPIRED",
  "BLOCKED",
  "CONSUMED",
  "RECALLED",
]);

const serialStatusContract: z.ZodType<SerialStatus> = z.enum([
  "IN_STOCK",
  "RESERVED",
  "SHIPPED",
  "RETURNED",
  "SCRAPPED",
  "QUARANTINE",
]);

const pageFields = {
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
};

const lotListItemContract = z.object({
  id: z.number().int(),
  productVariantId: z.number().int(),
  lotNumber: z.string(),
  manufactureDate: z.string().nullable(),
  expiryDate: z.string().nullable(),
  status: lotStatusContract,
  createdAt: z.string(),
  variantSku: z.string(),
  variantName: z.string(),
  productId: z.number().int(),
  productName: z.string(),
  totalOnHand: z.string(),
});

export const lotListContract = z.object({
  items: z.array(lotListItemContract),
  ...pageFields,
});

const variantWithProductContract = z.object({
  id: z.number().int(),
  sku: z.string(),
  name: z.string(),
  product: z.object({ id: z.number().int(), name: z.string() }),
});

const stockMovementContract = z.object({
  id: z.number().int(),
  transactionType: z.string(),
  quantityChange: z.string(),
  referenceType: z.string().nullable(),
  referenceId: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  location: z
    .object({ id: z.number().int(), name: z.string(), code: z.string() })
    .nullable(),
});

const stockByLocationContract = z.object({
  locationId: z.number().int(),
  locationName: z.string(),
  locationCode: z.string(),
  warehouseId: z.number().int(),
  warehouseName: z.string(),
  onHand: z.string(),
  committed: z.string(),
  blockedQty: z.string().nullable(),
});

export const lotDetailContract = z.object({
  lot: z.object({
    id: z.number().int(),
    lotNumber: z.string(),
    productVariantId: z.number().int(),
    status: lotStatusContract,
    manufactureDate: z.string().nullable(),
    expiryDate: z.string().nullable(),
    supplierLotNumber: z.string().nullable(),
    createdAt: z.string(),
    productVariant: variantWithProductContract,
  }),
  stockByLocation: z.array(stockByLocationContract),
  movements: z.array(stockMovementContract),
});

const serialListItemContract = z.object({
  id: z.number().int(),
  serialNumber: z.string(),
  lotId: z.number().int().nullable(),
  status: serialStatusContract,
  currentLocationId: z.number().int().nullable(),
  productVariantId: z.number().int(),
  createdAt: z.string(),
  variantSku: z.string(),
  variantName: z.string(),
  productId: z.number().int(),
  productName: z.string(),
  currentLocationName: z.string().nullable(),
  currentLocationCode: z.string().nullable(),
});

export const serialListContract = z.object({
  items: z.array(serialListItemContract),
  ...pageFields,
});

export const serialDetailContract = z.object({
  serial: z.object({
    id: z.number().int(),
    serialNumber: z.string(),
    lotId: z.number().int().nullable(),
    status: serialStatusContract,
    createdAt: z.string(),
    productVariant: variantWithProductContract,
    currentLocation: z
      .object({
        id: z.number().int(),
        name: z.string(),
        code: z.string(),
        warehouse: z.object({ id: z.number().int(), name: z.string() }),
      })
      .nullable(),
  }),
  movements: z.array(stockMovementContract),
});

const expiryItemContract = z.object({
  id: z.number().int(),
  lotNumber: z.string(),
  expiryDate: z.string().nullable(),
  status: lotStatusContract,
  productVariantId: z.number().int(),
  variantSku: z.string(),
  variantName: z.string(),
  productId: z.number().int(),
  productName: z.string(),
  totalOnHand: z.string(),
  daysUntilExpiry: z.number().int(),
});

export const expiryListContract = z.array(expiryItemContract);

const chainReturnContract = z.discriminatedUnion("category", [
  z.object({
    category: z.literal("vendor"),
    returnId: z.number().int(),
    returnNumber: z.string(),
    status: z.string(),
    quantity: z.string(),
    returnType: z.string(),
  }),
  z.object({
    category: z.literal("customer"),
    returnId: z.number().int(),
    returnNumber: z.string(),
    status: z.string(),
    quantity: z.string(),
    disposition: z.string().nullable(),
  }),
]);

export const traceabilityChainContract = z.object({
  origin: z
    .object({
      productVariant: z.object({
        sku: z.string(),
        name: z.string(),
        product: z.object({ name: z.string() }),
      }),
    })
    .nullish(),
  receipts: z.array(
    z.object({
      transactionId: z.number().int(),
      grnNumber: z.string(),
      receivedDate: z.string(),
      poNumber: z.string(),
      vendorName: z.string(),
      qtyReceived: z.string(),
      reversed: z.boolean(),
    }),
  ),
  currentStock: z.array(stockByLocationContract),
  shipments: z.array(
    z.object({
      shipmentId: z.number().int(),
      shipmentNumber: z.string(),
      status: z.string(),
      shippedAt: z.string().nullable(),
      quantity: z.string(),
    }),
  ),
  returns: z.array(chainReturnContract),
  events: z.array(
    stockMovementContract.extend({
      reversed: z.boolean(),
      creator: z.object({ name: z.string().nullable() }).nullable(),
    }),
  ),
});

export type LotList = z.infer<typeof lotListContract>;
export type LotDetail = z.infer<typeof lotDetailContract>;
export type LotStockByLocation = z.infer<typeof stockByLocationContract>;
export type StockMovement = z.infer<typeof stockMovementContract>;
export type SerialList = z.infer<typeof serialListContract>;
export type SerialDetail = z.infer<typeof serialDetailContract>;
export type ExpiryItem = z.infer<typeof expiryItemContract>;
export type TraceabilityChain = z.infer<typeof traceabilityChainContract>;
export type TraceabilityReturn = z.infer<typeof chainReturnContract>;
