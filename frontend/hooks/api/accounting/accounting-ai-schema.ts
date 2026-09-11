import { z } from "zod";

const evidenceSnapshotContract = z.object({
  periodLabel: z.string().optional(),
  accountName: z.string().optional(),
  accountCode: z.string().optional(),
  budgetAmount: z.number().optional(),
  actualAmount: z.number().optional(),
  varianceAmount: z.number().optional(),
  variancePct: z.number().optional(),
  priorPeriodAmount: z.number().optional(),
  notes: z.string().optional(),
});

export const explainVarianceContract = z.object({
  narration: z.string(),
  factors: z.array(z.string()),
  suggestedInvestigations: z.array(z.string()),
  evidenceSnapshot: evidenceSnapshotContract,
  generatedAt: z.string(),
});

const bankTxnSnapshotContract = z.object({
  date: z.string(),
  amount: z.number(),
  description: z.string(),
  counterparty: z.string().optional(),
});

const jeSnapshotContract = z.object({
  entryNumber: z.string(),
  entryDate: z.string(),
  description: z.string(),
  totalDebit: z.number(),
  totalCredit: z.number(),
});

const reconEvidenceContract = z.object({
  matchId: z.number(),
  matchedType: z.string(),
  bankTxn: bankTxnSnapshotContract,
  journalEntry: jeSnapshotContract.optional(),
  confidence: z.number().optional(),
  isConfirmed: z.boolean(),
});

export const explainReconciliationContract = z.object({
  narration: z.string(),
  factors: z.array(z.string()),
  evidenceSnapshot: reconEvidenceContract,
  generatedAt: z.string(),
});

const extractedLineItemContract = z.object({
  description: z.string(),
  quantity: z.number().nullable(),
  unitPrice: z.number().nullable(),
  lineTotal: z.number().nullable(),
});

const extractedDocumentContract = z.object({
  vendor: z.string(),
  documentDate: z.string().nullable(),
  documentNumber: z.string().nullable(),
  currency: z.string(),
  subtotalAmount: z.number().nullable(),
  taxAmount: z.number().nullable(),
  totalAmount: z.number().nullable(),
  lineItems: z.array(extractedLineItemContract),
  paymentTerms: z.string().nullable(),
  notes: z.string().nullable(),
});

export const extractDocumentContract = z.object({
  draft: extractedDocumentContract,
  sourceDocumentName: z.string(),
  mimeType: z.string(),
  confidence: z.number(),
  reviewRequired: z.literal(true),
  warningMessage: z.string(),
  generatedAt: z.string(),
});

export type ExplainVariance = z.infer<typeof explainVarianceContract>;
export type ExplainReconciliation = z.infer<typeof explainReconciliationContract>;
export type ExtractDocument = z.infer<typeof extractDocumentContract>;
