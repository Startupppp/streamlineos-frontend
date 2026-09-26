import { z } from "zod";

const pageFields = {
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
};

const evidenceItem = z.object({
  kind: z.string(),
  id: z.number().int(),
});

const anomalyDetector = z.object({
  type: z.enum(["stockout_risk", "dead_stock", "vendor_delay", "negative_stock", "unusual_adjustments", "expiry_risk"]),
  label: z.string(),
  formula: z.string(),
  windowLabel: z.string(),
  severityRule: z.string(),
  href: z.string(),
}).passthrough();

const anomaly = z.object({
  id: z.number().int(),
  type: z.string(),
  severity: z.string(),
  status: z.enum(["NEW", "ACKNOWLEDGED", "DISMISSED"]),
  title: z.string(),
  body: z.string(),
  warehouseId: z.number().int().nullable(),
  windowDays: z.number().int().nullable(),
  evidenceHash: z.string().nullable(),
  evidence: z.array(evidenceItem),
  detector: anomalyDetector.nullable(),
  acknowledgedBy: z.string().nullable(),
  acknowledgedAt: z.string().nullable(),
  resolutionNote: z.string().nullable(),
  createdAt: z.string(),
}).passthrough();

export const anomalyPageContract = z.object({
  items: z.array(anomaly),
  ...pageFields,
  orgWideSignalsHidden: z.boolean(),
}).passthrough();
export const anomalyContract = anomaly;

const demandRiskCoverage = z.object({
  from: z.string(),
  to: z.string(),
  periods: z.number().int(),
  historyWeeks: z.number().int(),
  horizonWeeks: z.number().int(),
}).passthrough();

const demandRiskUncertainty = z.object({
  method: z.string().nullable(),
  demandCategory: z.string(),
  mae: z.string().nullable(),
  rmse: z.string().nullable(),
  bias: z.string().nullable(),
  mase: z.string().nullable(),
  demandMean: z.string(),
  demandStdDev: z.string(),
  serviceLevel: z.string(),
  z: z.string().nullable(),
  applicable: z.boolean(),
  refusalReason: z.string().nullable(),
  safetyStock: z.string().nullable(),
  reorderPoint: z.string().nullable(),
  leadTimeDemand: z.string().nullable(),
  censoredPeriods: z.number().int(),
  stockoutCensored: z.boolean(),
  censoringNote: z.string().nullable(),
  shapeNote: z.string().nullable(),
}).passthrough();

export const demandRiskContract = z.object({
  status: z.enum(["ok", "insufficient_evidence", "facts_only"]),
  productVariantId: z.number().int(),
  warehouseId: z.number().int().nullable(),
  coverage: demandRiskCoverage.nullable(),
  uncertainty: demandRiskUncertainty.nullable(),
  forecastId: z.number().int().nullable(),
  forecastGeneratedAt: z.string().nullable(),
  narration: z.string().nullable(),
  factors: z.array(z.object({ label: z.string(), value: z.string(), isFactual: z.boolean() })),
  actions: z.array(z.object({
    action: z.string(),
    label: z.string(),
    href: z.string().nullable(),
    permission: z.string(),
    mutates: z.boolean(),
    rationale: z.string(),
  })),
  missing: z.array(z.string()),
  evidence: z.array(evidenceItem),
  provenance: z.object({
    contractVersion: z.number().int(),
    promptKey: z.string(),
    promptVersion: z.number().int(),
    model: z.string(),
    correlationId: z.string(),
  }).passthrough().nullable(),
  aiUsage: z.object({
    model: z.string().nullable().optional(),
    promptTokens: z.number().int(),
    completionTokens: z.number().int(),
    totalTokens: z.number().int(),
    credits: z.number(),
    costUsd: z.number().nullable().optional(),
  }).passthrough().optional(),
  generatedAt: z.string(),
}).passthrough();

export const feedbackContract = z.object({
  id: z.number().int(),
  verdict: z.enum(["USEFUL", "WRONG", "STALE", "UNSAFE"]),
  surface: z.string(),
  createdAt: z.string(),
}).passthrough();

const feedbackSurface = z.object({
  surface: z.string(),
  useful: z.number().int(),
  wrong: z.number().int(),
  stale: z.number().int(),
  unsafe: z.number().int(),
  total: z.number().int(),
  usefulRatio: z.number().nullable(),
});

export const feedbackSummaryContract = z.object({
  days: z.number().int(),
  surfaces: z.array(feedbackSurface),
  unsafeTotal: z.number().int(),
}).passthrough();

export const auditExportJobContract = z.object({
  id: z.number().int(),
  status: z.enum(["PENDING", "VALIDATING", "RUNNING", "COMPLETED", "FAILED"]),
  schemaVersion: z.number().int(),
  evidenceVersion: z.string(),
  sections: z.array(z.string()),
  scopeWarehouseIds: z.array(z.number().int()).nullable(),
  filterFrom: z.string().nullable(),
  filterTo: z.string().nullable(),
  ledgerRowCount: z.number().int().nullable(),
  auditRowCount: z.number().int().nullable(),
  checksumAlgorithm: z.string(),
  checksum: z.string().nullable(),
  byteLength: z.number().int().nullable(),
  settledAt: z.string().nullable(),
  failureReason: z.string().nullable(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).passthrough();

export const auditExportPageContract = z.object({
  items: z.array(auditExportJobContract),
  ...pageFields,
}).passthrough();

export const auditExportVerificationContract = z.object({
  jobId: z.number().int(),
  schemaVersion: z.number().int(),
  evidenceVersion: z.string(),
  checksumAlgorithm: z.string(),
  expectedChecksum: z.string().nullable(),
  actualChecksum: z.string(),
  expectedByteLength: z.number().int().nullable(),
  actualByteLength: z.number().int(),
  match: z.boolean(),
}).passthrough();

export const variantLabelContract = z.object({
  productVariantId: z.number().int(),
  productId: z.number().int(),
  productName: z.string(),
  variantName: z.string(),
  sku: z.string(),
  code: z.string(),
  codeSource: z.enum(["barcode", "sku"]),
  uom: z.string().nullable(),
  lot: z.object({
    lotId: z.number().int(),
    lotNumber: z.string(),
    expiryDate: z.string().nullable(),
    manufactureDate: z.string().nullable(),
  }).passthrough().nullable(),
  gs1: z.string().nullable(),
  qrDataUri: z.string(),
  printedAt: z.string(),
  organizationName: z.string(),
}).passthrough();

const vendorReturnLine = z.object({
  id: z.number().int(),
  productVariantId: z.number().int(),
  quantity: z.string(),
  reason: z.enum(["DAMAGED", "WRONG_ITEM", "EXCESS", "EXPIRED", "QUALITY_REJECTED"]),
  lotId: z.number().int().nullable(),
  serialId: z.number().int().nullable(),
  unitCost: z.string().nullable(),
}).passthrough();

const vendorReturn = z.object({
  id: z.number().int(),
  returnNumber: z.string(),
  vendorId: z.number().int(),
  vendor: z.object({ id: z.number().int(), name: z.string() }).passthrough().nullable(),
  poId: z.number().int().nullable(),
  grnId: z.number().int().nullable(),
  status: z.enum(["DRAFT", "APPROVED", "POSTED", "CANCELLED"]),
  createdAt: z.string(),
  approvedAt: z.string().nullable(),
  postedAt: z.string().nullable(),
  creditReference: z.string().nullable(),
  notes: z.string().nullable(),
  lines: z.array(vendorReturnLine),
}).passthrough();

export const vendorReturnContract = vendorReturn;
export const vendorReturnPageContract = z.object({
  items: z.array(vendorReturn),
  ...pageFields,
}).passthrough();
