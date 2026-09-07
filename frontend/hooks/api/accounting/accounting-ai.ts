"use client";

import { apiClient } from "@/lib/api-client";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { AiAbortInput } from "@/hooks/api/ai-abort";
import { queryKeyBase } from "@/lib/query-keys/base";
import {
  explainVarianceContract,
  explainReconciliationContract,
  extractDocumentContract,
} from "@/hooks/api/accounting/accounting-ai-schema";

export interface VarianceExplainBody {
  periodLabel: string;
  accountName: string;
  accountCode: string;
  budgetAmount: number;
  actualAmount: number;
  varianceAmount: number;
  variancePct: number;
  priorPeriodAmount?: number;
  notes?: string;
}

export interface VarianceExplainResult {
  narration: string;
  factors: string[];
  suggestedInvestigations: string[];
  evidenceSnapshot: Record<string, unknown>;
  generatedAt: string;
}

export interface ReconciliationExplainBody {
  matchId: number;
}

export interface ReconciliationExplainResult {
  narration: string;
  factors: string[];
  evidenceSnapshot: Record<string, unknown>;
  generatedAt: string;
}

export interface ExtractDocumentBody {
  fileBase64: string;
  mimeType: string;
  sourceDocumentName: string;
}

export interface ExtractedLineItem {
  description: string;
  quantity: number | null;
  unitPrice: number | null;
  lineTotal: number | null;
}

export interface ExtractedDocumentDraft {
  vendor: string;
  documentDate: string | null;
  documentNumber: string | null;
  currency: string;
  subtotalAmount: number | null;
  taxAmount: number | null;
  totalAmount: number | null;
  lineItems: ExtractedLineItem[];
  paymentTerms: string | null;
  notes: string | null;
}

export interface ExtractDocumentResult {
  draft: ExtractedDocumentDraft;
  sourceDocumentName: string;
  mimeType: string;
  confidence: number;
  reviewRequired: true;
  warningMessage: string;
  generatedAt: string;
}

export function useExplainVariance() {
  return useAuthorizedMutation("accounting:ai:use", {
    mutationKey: [...queryKeyBase, "accounting", "ai", "variance-explain"] as const,
    mutationFn: ({ signal, ...body }: VarianceExplainBody & AiAbortInput) =>
      apiClient.post("/finance/ai/variance-explain", body, { signal }, explainVarianceContract),
  });
}

export function useExplainReconciliation() {
  return useAuthorizedMutation("accounting:ai:use", {
    mutationKey: [...queryKeyBase, "accounting", "ai", "reconciliation-explain"] as const,
    mutationFn: ({ signal, ...body }: ReconciliationExplainBody & AiAbortInput) =>
      apiClient.post("/finance/ai/reconciliation-explain", body, { signal }, explainReconciliationContract),
  });
}

export function useExtractDocument() {
  return useAuthorizedMutation("accounting:ai:use", {
    mutationKey: [...queryKeyBase, "accounting", "ai", "extract-document"] as const,
    mutationFn: ({ signal, ...body }: ExtractDocumentBody & AiAbortInput) =>
      apiClient.post("/finance/ai/extract-document", body, { signal }, extractDocumentContract),
  });
}
