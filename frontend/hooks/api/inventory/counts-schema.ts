import { z } from "zod";

const userRefContract = z.object({ id: z.string(), name: z.string().nullable() });

const countLineProductVariantContract = z.object({
  id: z.number().int(),
  name: z.string(),
  sku: z.string(),
  product: z.object({ id: z.number().int(), name: z.string(), sku: z.string() }),
});

const countLineLocationContract = z.object({
  id: z.number().int(),
  name: z.string(),
  code: z.string(),
});

const cycleCountLineContract = z.object({
  id: z.number().int(),
  productVariantId: z.number().int(),
  locationId: z.number().int(),
  lotId: z.number().int().nullable(),
  systemQty: z.string(),
  countedQty: z.string().nullable(),
  varianceQty: z.string().nullable(),
  productVariant: countLineProductVariantContract.optional(),
  location: countLineLocationContract.optional(),
});

export const cycleCountContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  countNumber: z.string(),
  warehouseId: z.number().int(),
  locationId: z.number().int().nullable(),
  categoryId: z.number().int().nullable(),
  status: z.string(),
  createdBy: z.string(),
  createdByMembershipId: z.number().int().nullable(),
  approvedBy: z.string().nullable(),
  approvedByMembershipId: z.number().int().nullable(),
  postedAt: z.string().nullable(),
  cancelledAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  creator: userRefContract.optional(),
  lines: z.array(cycleCountLineContract).optional(),
});

export const listCycleCountsContract = z.object({
  items: z.array(cycleCountContract),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});

const auditLineContract = z.object({
  id: z.number().int(),
  auditId: z.number().int(),
  productVariantId: z.number().int(),
  locationId: z.number().int(),
  lotId: z.number().int().nullable(),
  systemQty: z.string(),
  countedQty: z.string().nullable(),
  varianceQty: z.string().nullable(),
  productVariant: countLineProductVariantContract.optional(),
  location: countLineLocationContract.optional(),
});

const physicalAuditContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  auditNumber: z.string(),
  warehouseId: z.number().int(),
  status: z.string(),
  createdBy: z.string(),
  createdByMembershipId: z.number().int().nullable(),
  approvedBy: z.string().nullable(),
  approvedByMembershipId: z.number().int().nullable(),
  postedAt: z.string().nullable(),
  cancelledAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  creator: userRefContract.optional(),
  lines: z.array(auditLineContract).optional(),
});

export const listAuditsContract = z.object({
  items: z.array(physicalAuditContract),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});

export const physicalAuditDetailContract = physicalAuditContract;
