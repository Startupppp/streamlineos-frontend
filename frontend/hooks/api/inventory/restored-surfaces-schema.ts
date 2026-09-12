import { z } from "zod";

const pageFields = {
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
};

const anomaly = z.object({
  id: z.number().int(),
  status: z.string(),
  severity: z.string(),
  type: z.string(),
}).passthrough();

export const anomalyPageContract = z.object({
  items: z.array(anomaly),
  ...pageFields,
}).passthrough();
export const anomalyContract = anomaly;

export const demandRiskContract = z.object({
  status: z.enum(["ok", "insufficient_evidence", "facts_only"]),
  productVariantId: z.number().int(),
  factors: z.array(z.unknown()),
  actions: z.array(z.unknown()),
}).passthrough();

export const feedbackContract = z.object({}).passthrough();
export const feedbackSummaryContract = z.object({}).passthrough();

export const auditExportJobContract = z.object({
  id: z.number().int(),
  status: z.string(),
}).passthrough();
export const auditExportPageContract = z.object({
  items: z.array(auditExportJobContract),
  ...pageFields,
}).passthrough();
export const auditExportVerificationContract = z.object({
  jobId: z.number().int(),
  match: z.boolean(),
}).passthrough();

export const variantLabelContract = z.object({
  productVariantId: z.number().int(),
  sku: z.string(),
  code: z.string(),
  qrDataUri: z.string(),
}).passthrough();

const vendorReturn = z.object({
  id: z.number().int(),
  returnNumber: z.string(),
  status: z.string(),
}).passthrough();
export const vendorReturnContract = vendorReturn;
export const vendorReturnPageContract = z.object({
  items: z.array(vendorReturn),
  ...pageFields,
}).passthrough();
