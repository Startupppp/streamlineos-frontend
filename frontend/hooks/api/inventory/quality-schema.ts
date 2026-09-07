import { z } from "zod";

const userRefContract = z.object({ id: z.string(), name: z.string().nullable() });

const holdContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  productVariantId: z.number().int(),
  locationId: z.number().int().nullable(),
  lotId: z.number().int().nullable(),
  quantity: z.string(),
  reason: z.string(),
  notes: z.string().nullable(),
  status: z.string(),
  resolvedAt: z.string().nullable(),
  resolvedBy: z.string().nullable(),
  createdBy: z.string(),
  createdByMembershipId: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  productVariant: z.object({ id: z.number().int(), name: z.string(), sku: z.string() }).optional(),
  location: z.object({ id: z.number().int(), name: z.string(), code: z.string() }).nullable().optional(),
  creator: userRefContract.optional(),
});

export const listHoldsContract = z.object({
  items: z.array(holdContract),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});

const inspectionLineContract = z.object({
  id: z.number().int(),
  inspectionId: z.number().int(),
  productVariantId: z.number().int(),
  lotId: z.number().int().nullable(),
  serialId: z.number().int().nullable(),
  quantityInspected: z.string(),
  quantityPassed: z.string().nullable(),
  quantityFailed: z.string().nullable(),
  disposition: z.string().nullable(),
  notes: z.string().nullable(),
  productVariant: z.object({ id: z.number().int(), name: z.string(), sku: z.string() }).optional(),
});

const inspectionContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  referenceNumber: z.string(),
  sourceType: z.string().nullable(),
  sourceId: z.number().int().nullable(),
  status: z.string(),
  inspectedBy: z.string().nullable(),
  inspectedByMembershipId: z.number().int().nullable(),
  inspectedAt: z.string().nullable(),
  notes: z.string().nullable(),
  createdBy: z.string(),
  createdByMembershipId: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  inspector: userRefContract.nullable().optional(),
  creator: userRefContract.optional(),
  lines: z.array(inspectionLineContract).optional(),
});

export const listInspectionsContract = z.object({
  items: z.array(inspectionContract),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});

export const createInspectionContract = inspectionContract;

const recallLineContract = z.object({
  id: z.number().int(),
  recallId: z.number().int(),
  productVariantId: z.number().int(),
  lotId: z.number().int().nullable(),
  estimatedQty: z.string().nullable(),
  confirmedQty: z.string().nullable(),
  status: z.string(),
  notes: z.string().nullable(),
  productVariant: z.object({ id: z.number().int(), name: z.string(), sku: z.string() }).optional(),
});

const recallContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  referenceNumber: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  severity: z.string(),
  status: z.string(),
  initiatedAt: z.string().nullable(),
  resolvedAt: z.string().nullable(),
  createdBy: z.string(),
  createdByMembershipId: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  creator: userRefContract.optional(),
  lines: z.array(recallLineContract).optional(),
});

export const listRecallsContract = z.object({
  items: z.array(recallContract),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});

export const getRecallContract = recallContract;
export const createRecallContract = recallContract;
export const getHoldContract = holdContract;
export const createHoldContract = holdContract;
