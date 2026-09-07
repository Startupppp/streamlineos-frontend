import { z } from "zod";

const lotContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  productVariantId: z.number().int(),
  lotNumber: z.string(),
  expiryDate: z.string().nullable(),
  manufacturedDate: z.string().nullable(),
  status: z.string(),
  notes: z.string().nullable(),
  attributes: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  productVariant: z.object({ id: z.number().int(), name: z.string(), sku: z.string() }).optional(),
});

export const listLotsContract = z.object({
  items: z.array(lotContract),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});

const serialContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  productVariantId: z.number().int(),
  serialNumber: z.string(),
  status: z.string(),
  lotId: z.number().int().nullable(),
  locationId: z.number().int().nullable(),
  notes: z.string().nullable(),
  attributes: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  productVariant: z.object({ id: z.number().int(), name: z.string(), sku: z.string() }).optional(),
  location: z.object({ id: z.number().int(), name: z.string(), code: z.string() }).nullable().optional(),
});

export const listSerialsContract = z.object({
  items: z.array(serialContract),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});

export const updateLotStatusContract = lotContract;

export const getLotDetailContract = lotContract.extend({
  stockLevels: z.array(z.object({
    locationId: z.number().int(),
    locationName: z.string(),
    onHand: z.string(),
  })).optional(),
  transactions: z.array(z.object({
    id: z.number().int(),
    transactionType: z.string(),
    quantityChange: z.string(),
    createdAt: z.string(),
  })).optional(),
});

export const getSerialDetailContract = serialContract.extend({
  transactions: z.array(z.object({
    id: z.number().int(),
    transactionType: z.string(),
    quantityChange: z.string(),
    createdAt: z.string(),
  })).optional(),
});

const traceabilityExpiryItemContract = z.object({
  lotId: z.number().int(),
  lotNumber: z.string(),
  productVariantId: z.number().int(),
  variantSku: z.string(),
  variantName: z.string(),
  productName: z.string(),
  expiryDate: z.string().nullable(),
  daysUntilExpiry: z.number().int().nullable(),
  onHand: z.string(),
  locationId: z.number().int().nullable(),
  locationName: z.string().nullable(),
});

export const traceabilityExpiryReportContract = z.object({
  items: z.array(traceabilityExpiryItemContract),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});

export const traceabilityChainContract = z.object({
  sourceType: z.string(),
  sourceId: z.string(),
  nodes: z.array(z.object({
    type: z.string(),
    id: z.string(),
    label: z.string(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })),
  edges: z.array(z.object({
    fromId: z.string(),
    toId: z.string(),
    relationship: z.string(),
  })),
});

export const expiryItemsArrayContract = z.array(traceabilityExpiryItemContract);
