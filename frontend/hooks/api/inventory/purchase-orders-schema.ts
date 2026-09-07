import { z } from "zod";

const userRefContract = z.object({ id: z.string(), name: z.string().nullable() });
const vendorRefContract = z.object({ id: z.number().int(), name: z.string() });
const variantRefContract = z.object({ id: z.number().int(), name: z.string(), sku: z.string() });

const poLineContract = z.object({
  id: z.number().int(),
  poId: z.number().int(),
  productVariantId: z.number().int(),
  quantity: z.string(),
  unitCost: z.string(),
  totalCost: z.string(),
  receivedQty: z.string(),
  billedQty: z.string(),
  uomId: z.number().int().nullable(),
  quantityEntered: z.string().nullable(),
  notes: z.string().nullable(),
  productVariant: variantRefContract.optional(),
});

const invPoContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  poNumber: z.string(),
  vendorId: z.number().int(),
  warehouseId: z.number().int().nullable(),
  status: z.string(),
  totalAmount: z.string(),
  currency: z.string().nullable(),
  expectedDeliveryDate: z.string().nullable(),
  confirmedAt: z.string().nullable(),
  receivedAt: z.string().nullable(),
  cancelledAt: z.string().nullable(),
  notes: z.string().nullable(),
  createdBy: z.string(),
  createdByMembershipId: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  vendor: vendorRefContract.optional(),
  creator: userRefContract.optional(),
  lines: z.array(poLineContract).optional(),
});

export const listPosContract = z.object({
  items: z.array(invPoContract),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});

export const getPoContract = invPoContract;

const grnLineContract = z.object({
  id: z.number().int(),
  grnId: z.number().int(),
  poLineId: z.number().int().nullable(),
  productVariantId: z.number().int(),
  locationId: z.number().int().nullable(),
  lotId: z.number().int().nullable(),
  serialId: z.number().int().nullable(),
  quantityReceived: z.string(),
  unitCost: z.string().nullable(),
  uomId: z.number().int().nullable(),
  quantityEntered: z.string().nullable(),
  notes: z.string().nullable(),
  productVariant: variantRefContract.optional(),
});

const grnContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  grnNumber: z.string(),
  poId: z.number().int().nullable(),
  vendorId: z.number().int().nullable(),
  warehouseId: z.number().int().nullable(),
  status: z.string(),
  notes: z.string().nullable(),
  postedAt: z.string().nullable(),
  cancelledAt: z.string().nullable(),
  createdBy: z.string(),
  createdByMembershipId: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  creator: userRefContract.optional(),
  lines: z.array(grnLineContract).optional(),
});

export const listGrnsContract = z.object({
  items: z.array(grnContract),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});

export const getGrnContract = grnContract;

export const reverseGrnContract = z.object({
  reversalGrnId: z.number().int(),
  reversalGrnNumber: z.string(),
  originalGrnId: z.number().int(),
});
