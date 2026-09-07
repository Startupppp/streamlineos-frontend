import { z } from "zod";

export const invSettingsContract = z.object({
  allowNegativeStock: z.boolean(),
  allowBackorders: z.boolean(),
  reservationStrategy: z.string(),
  defaultCostingMethod: z.string(),
  expiryReservationPolicy: z.string(),
  inspectionOnReceipt: z.boolean(),
  inspectionOnReturn: z.boolean(),
  overReceiptTolerancePct: z.string(),
  requirePoApproval: z.boolean(),
  adjustmentApprovalThreshold: z.string().nullable(),
  autoReserveOnConfirm: z.boolean(),
  allowPartialShipment: z.boolean(),
  packageRequiredForShipping: z.boolean(),
  channelPublishPolicy: z.string().nullable(),
});

const numberSequenceContract = z.object({
  id: z.number().int().optional(),
  orgId: z.string().optional(),
  docType: z.string(),
  prefix: z.string(),
  nextNumber: z.number().int(),
  padding: z.number().int(),
  isDefault: z.boolean(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
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
  ledgerReconciliation: z.object({
    sampleSize: z.number().int(),
    transactionCount: z.number().int(),
    status: z.string(),
  }),
  activeExpiredReservations: z.number().int(),
  failedImportJobs: z.number().int(),
  failedExportJobs: z.number().int(),
  failedWebhookEvents: z.number().int(),
  failedChannelPublications: z.number().int(),
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
  orgId: z.string(),
  jobType: z.string(),
  status: z.string(),
  fileName: z.string().nullable(),
  totalRows: z.number().int(),
  processedRows: z.number().int(),
  errorRows: z.number().int(),
  errors: z.array(importJobErrorContract).nullable(),
  createdBy: z.string(),
  createdByMembershipId: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
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
  createdByMembershipId: z.number().int().nullable(),
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
