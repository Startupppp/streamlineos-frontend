import { z } from "zod";

const userRefContract = z.object({ id: z.string(), name: z.string().nullable() });

const cycleCountLineContract = z.object({
  id: z.number().int(),
  countId: z.number().int(),
  productVariantId: z.number().int(),
  locationId: z.number().int().nullable(),
  lotId: z.number().int().nullable(),
  serialId: z.number().int().nullable(),
  systemQty: z.string(),
  countedQty: z.string().nullable(),
  variance: z.string().nullable(),
  notes: z.string().nullable(),
  productVariant: z.object({ id: z.number().int(), name: z.string(), sku: z.string() }).optional(),
  location: z.object({ id: z.number().int(), name: z.string(), code: z.string() }).optional(),
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
  locationId: z.number().int().nullable(),
  lotId: z.number().int().nullable(),
  serialId: z.number().int().nullable(),
  systemQty: z.string(),
  countedQty: z.string().nullable(),
  variance: z.string().nullable(),
  notes: z.string().nullable(),
  productVariant: z.object({ id: z.number().int(), name: z.string(), sku: z.string() }).optional(),
  location: z.object({ id: z.number().int(), name: z.string(), code: z.string() }).optional(),
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
