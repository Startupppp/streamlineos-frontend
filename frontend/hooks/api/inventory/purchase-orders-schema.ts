import { z } from "zod";

const userRefContract = z.object({ id: z.string(), name: z.string().nullable() });
const vendorRefContract = z.object({ id: z.number().int(), name: z.string(), code: z.string() });
const warehouseRefContract = z.object({ id: z.number().int(), name: z.string(), code: z.string() });
const productRefContract = z.object({ id: z.number().int(), name: z.string(), sku: z.string() });
const variantRefContract = z.object({
  id: z.number().int(),
  name: z.string(),
  sku: z.string(),
  product: productRefContract.optional(),
});

const poLineContract = z.object({
  id: z.number().int(),
  poId: z.number().int(),
  productVariantId: z.number().int(),
  quantity: z.string(),
  unitCost: z.string(),
  taxRate: z.string(),
  lineOrder: z.number().int(),
  amount: z.string(),
  quantityReceived: z.string(),
  uomId: z.number().int().nullable(),
  quantityEntered: z.string().nullable(),
  productVariant: variantRefContract.optional(),
});

const invPoContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  poNumber: z.string(),
  vendorId: z.number().int(),
  warehouseId: z.number().int().nullable(),
  status: z.string(),
  orderDate: z.string(),
  subtotal: z.string(),
  taxAmount: z.string(),
  discount: z.string(),
  total: z.string(),
  currency: z.string(),
  expectedDeliveryDate: z.string().nullable(),
  sentAt: z.string().nullable(),
  approvedBy: z.string().nullable(),
  approvedByMembershipId: z.number().int().nullable(),
  approvedAt: z.string().nullable(),
  notes: z.string().nullable(),
  createdBy: z.string(),
  createdByMembershipId: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  vendor: vendorRefContract.optional(),
  warehouse: warehouseRefContract.optional(),
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
  poLineId: z.number().int(),
  quantityReceived: z.string(),
  uomId: z.number().int().nullable(),
  quantityEntered: z.string().nullable(),
  status: z.string(),
  rejectionReason: z.string().nullable(),
});

const grnContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  grnNumber: z.string(),
  poId: z.number().int(),
  receivedDate: z.string(),
  locationId: z.number().int().nullable(),
  status: z.string(),
  notes: z.string().nullable(),
  createdBy: z.string(),
  createdByMembershipId: z.number().int().nullable(),
  createdAt: z.string(),
  creator: userRefContract.optional(),
  po: z.object({ id: z.number().int(), poNumber: z.string() }).optional(),
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
