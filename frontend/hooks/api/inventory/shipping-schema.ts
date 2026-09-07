import { z } from "zod";

const carrierContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  code: z.string().nullable(),
  trackingUrlTemplate: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const listCarriersContract = z.object({
  items: z.array(carrierContract),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});

const shipmentLineContract = z.object({
  id: z.number().int(),
  shipmentId: z.number().int(),
  productVariantId: z.number().int(),
  quantity: z.string(),
  lotId: z.number().int().nullable(),
  serialId: z.number().int().nullable(),
  notes: z.string().nullable(),
  productVariant: z.object({ id: z.number().int(), name: z.string(), sku: z.string() }).optional(),
});

const shipmentContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  shipmentNumber: z.string(),
  soId: z.number().int().nullable(),
  warehouseId: z.number().int().nullable(),
  carrierId: z.number().int().nullable(),
  status: z.string(),
  trackingNumber: z.string().nullable(),
  shippedAt: z.string().nullable(),
  deliveredAt: z.string().nullable(),
  cancelledAt: z.string().nullable(),
  notes: z.string().nullable(),
  createdBy: z.string(),
  createdByMembershipId: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  carrier: carrierContract.nullable().optional(),
  lines: z.array(shipmentLineContract).optional(),
});

export const listShipmentsContract = z.object({
  items: z.array(shipmentContract),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});

export const getShipmentContract = shipmentContract;

const packageItemContract = z.object({
  id: z.number().int(),
  packageId: z.number().int(),
  productVariantId: z.number().int(),
  quantity: z.string(),
  lotId: z.number().int().nullable(),
  serialId: z.number().int().nullable(),
  productVariant: z.object({ id: z.number().int(), name: z.string(), sku: z.string() }).optional(),
});

const packageContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  packageNumber: z.string(),
  shipmentId: z.number().int().nullable(),
  loadId: z.number().int().nullable(),
  packageType: z.string().nullable(),
  weight: z.string().nullable(),
  weightUnit: z.string().nullable(),
  dimensions: z.record(z.string(), z.unknown()).nullable(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  items: z.array(packageItemContract).optional(),
});

export const listPackagesContract = z.object({
  items: z.array(packageContract),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});

export const getPackageContract = packageContract;

const loadContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  loadNumber: z.string(),
  carrierId: z.number().int().nullable(),
  status: z.string(),
  departedAt: z.string().nullable(),
  arrivedAt: z.string().nullable(),
  cancelledAt: z.string().nullable(),
  notes: z.string().nullable(),
  createdBy: z.string(),
  createdByMembershipId: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  carrier: carrierContract.nullable().optional(),
  packages: z.array(packageContract).optional(),
});

export const listLoadsContract = z.object({
  items: z.array(loadContract),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});

export const getLoadContract = loadContract;

export const carriersArrayContract = z.array(carrierContract);
export const carrierDetailContract = carrierContract;
