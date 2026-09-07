import { z } from "zod";

const soLineContract = z.object({
  id: z.number().int(),
  soId: z.number().int(),
  productVariantId: z.number().int(),
  quantity: z.string(),
  unitPrice: z.string(),
  totalPrice: z.string(),
  fulfilledQty: z.string(),
  shippedQty: z.string(),
  notes: z.string().nullable(),
  productVariant: z.object({ id: z.number().int(), name: z.string(), sku: z.string() }).optional(),
});

const salesOrderContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  soNumber: z.string(),
  clientId: z.number().int().nullable(),
  warehouseId: z.number().int().nullable(),
  status: z.string(),
  totalAmount: z.string(),
  currency: z.string().nullable(),
  expectedDeliveryDate: z.string().nullable(),
  confirmedAt: z.string().nullable(),
  fulfilledAt: z.string().nullable(),
  cancelledAt: z.string().nullable(),
  notes: z.string().nullable(),
  createdBy: z.string(),
  createdByMembershipId: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  lines: z.array(soLineContract).optional(),
  client: z.object({ id: z.number().int(), name: z.string() }).nullable().optional(),
  creator: z.object({ id: z.string(), name: z.string().nullable() }).optional(),
});

export const listSalesOrdersContract = z.object({
  items: z.array(salesOrderContract),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});

export const getSalesOrderContract = salesOrderContract;

export const salesOrderMutationContract = salesOrderContract;

export const rawAtpArrayContract = z.array(z.object({
  productVariantId: z.number().int(),
  onHand: z.number(),
  committed: z.number(),
  blocked: z.number(),
  qualityHold: z.number(),
  onOrder: z.number(),
  available: z.number(),
  incomingQty: z.number(),
  outgoingQty: z.number(),
}));
