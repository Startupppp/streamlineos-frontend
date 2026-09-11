import { z } from "zod";

const LOCATION_TYPE_VALUES = [
  "ZONE",
  "AISLE",
  "RACK",
  "BIN",
  "RECEIVING",
  "SHIPPING",
  "QUARANTINE",
  "SCRAP",
  "TRANSIT",
  "RETURNS",
] as const;

export type LocationType = (typeof LOCATION_TYPE_VALUES)[number];

export const invLocationContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  warehouseId: z.number().int(),
  parentLocationId: z.number().int().nullable(),
  name: z.string(),
  code: z.string(),
  locationType: z.enum(LOCATION_TYPE_VALUES),
  isPickable: z.boolean(),
  isReceivable: z.boolean(),
  isActive: z.boolean(),
  capacity: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const invWarehouseContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  code: z.string(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  country: z.string().nullable(),
  isDefault: z.boolean(),
  isActive: z.boolean(),
  branchId: z.number().int().nullable(),
  managerUserId: z.string().nullable(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const listWarehousesContract = z.object({
  items: z.array(invWarehouseContract.extend({
    _count: z.object({ locations: z.number().int() }),
  })),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  totalPages: z.number().int(),
});

export const getWarehouseContract = invWarehouseContract.extend({
  locations: z.array(invLocationContract.extend({
    children: z.array(invLocationContract),
  })),
});

export const listLocationsContract = z.array(invLocationContract);

export const getWarehouseStockContract = z.object({
  items: z.array(z.object({
    locationId: z.number().int(),
    locationCode: z.string(),
    locationName: z.string(),
    productVariantId: z.number().int(),
    variantSku: z.string(),
    variantName: z.string(),
    productId: z.number().int(),
    productName: z.string(),
    onHand: z.string(),
    committed: z.string(),
    onOrder: z.string(),
  })),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});

export type StockRow = z.infer<typeof getWarehouseStockContract>["items"][number];
export type StockResult = z.infer<typeof getWarehouseStockContract>;
