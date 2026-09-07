import { z } from "zod";

export const invSettingsContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  defaultCostingMethod: z.string().nullable(),
  allowNegativeStock: z.boolean(),
  autoReorderEnabled: z.boolean(),
  defaultCurrency: z.string().nullable(),
  stockAlertEmail: z.string().nullable(),
  lowStockThreshold: z.string().nullable(),
  trackLots: z.boolean(),
  trackSerials: z.boolean(),
  requireInspection: z.boolean(),
  defaultWarehouseId: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const numberSequenceContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  sequenceType: z.string(),
  prefix: z.string().nullable(),
  suffix: z.string().nullable(),
  nextNumber: z.number().int(),
  padding: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const numberSequencesArrayContract = z.array(numberSequenceContract);

export const listNumberSequencesContract = z.object({
  items: z.array(numberSequenceContract),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});

export const updateNumberSequenceContract = numberSequenceContract;

export const healthContract = z.object({
  status: z.string(),
  checks: z.record(z.string(), z.object({
    status: z.string(),
    message: z.string().nullable().optional(),
  })),
});

export const expireReservationsContract = z.object({
  expired: z.number().int(),
});

export const barcodeLookupContract = z.union([
  z.object({ type: z.literal("product"), productId: z.number().int(), productName: z.string(), sku: z.string() }),
  z.object({ type: z.literal("variant"), variantId: z.number().int(), productName: z.string(), variantSku: z.string(), barcode: z.string() }),
  z.object({ type: z.literal("lot"), lotId: z.number().int(), lotNumber: z.string(), variantSku: z.string(), productName: z.string() }),
  z.object({ type: z.literal("serial"), serialId: z.number().int(), serialNumber: z.string(), variantSku: z.string(), productName: z.string() }),
  z.object({ type: z.literal("location"), locationId: z.number().int(), locationName: z.string(), warehouseName: z.string() }),
  z.object({ type: z.literal("not_found") }),
]);

const importJobErrorContract = z.object({ row: z.number().int(), field: z.string(), message: z.string() });

const importJobContract = z.object({
  id: z.number().int(),
  orgId: z.string().optional(),
  importType: z.string(),
  status: z.string(),
  totalRows: z.number().int(),
  processedRows: z.number().int(),
  errorCount: z.number().int(),
  errors: z.array(importJobErrorContract).optional(),
  createdAt: z.string(),
  completedAt: z.string().nullable(),
});

export const importPreviewContract = z.object({
  columns: z.array(z.string()),
  mappedFields: z.record(z.string(), z.string()),
  validRows: z.number().int(),
  errors: z.array(importJobErrorContract),
  sample: z.array(z.record(z.string(), z.unknown())),
});

export const importJobDetailContract = importJobContract;

export const listImportJobsContract = z.object({
  items: z.array(importJobContract),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});

const exportJobContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  jobType: z.string(),
  status: z.string(),
  fileName: z.string().nullable(),
  totalRows: z.number().int(),
  processedRows: z.number().int(),
  errorRows: z.number().int(),
  errors: z.array(importJobErrorContract).nullable(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createExportJobContract = exportJobContract;

export const exportJobsListContract = z.object({
  items: z.array(exportJobContract),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});
