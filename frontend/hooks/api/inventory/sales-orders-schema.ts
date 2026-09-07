import { z } from "zod";

const soStatusEnum = z.enum([
  "DRAFT",
  "CONFIRMED",
  "PARTIALLY_RESERVED",
  "RESERVED",
  "PICKED",
  "PACKED",
  "PARTIALLY_SHIPPED",
  "SHIPPED",
  "INVOICED",
  "CLOSED",
  "CANCELLED",
]);

const soLineContract = z.object({
  id: z.number().int(),
  soId: z.number().int(),
  productVariantId: z.number().int(),
  quantity: z.string(),
  unitPrice: z.string(),
  amount: z.string(),
  taxRate: z.string().nullable(),
  productVariant: z.object({
    product: z.object({
      id: z.number().int(),
      name: z.string().nullable(),
      sku: z.string().nullable(),
    }).nullable(),
  }).nullable().optional(),
});

const salesOrderContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  soNumber: z.string(),
  clientId: z.number().int().nullable(),
  warehouseId: z.number().int().nullable(),
  status: soStatusEnum,
  total: z.string(),
  subtotal: z.string().optional(),
  currency: z.string().nullable(),
  orderDate: z.string().nullable(),
  requiredDate: z.string().nullable(),
  confirmedAt: z.string().nullable(),
  shippedAt: z.string().nullable(),
  notes: z.string().nullable(),
  shippingAddress: z.string().nullable().optional(),
  createdBy: z.string(),
  createdByMembershipId: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  invoiceId: z.number().int().nullable().optional(),
  lines: z.array(soLineContract).optional(),
  client: z.object({ id: z.number().int(), name: z.string().nullable() }).nullable().optional(),
  warehouse: z.object({ id: z.number().int(), name: z.string().nullable() }).nullable().optional(),
  invoice: z.object({ id: z.number().int(), invoiceNumber: z.string().nullable() }).nullable().optional(),
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

export const invoiceContract = z.object({
  id: z.number().int(),
  invoiceNumber: z.string(),
});

export const reserveSoContract = z.object({
  status: soStatusEnum,
  shortfalls: z.array(z.object({
    soLineId: z.number().int(),
    requested: z.number(),
    available: z.number(),
  })).optional(),
});

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
