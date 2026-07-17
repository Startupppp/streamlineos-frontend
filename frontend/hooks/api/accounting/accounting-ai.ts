"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

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

export interface AiNarrationFactor {
  label: string;
  value: string;
  isFactual: boolean;
}

export interface VarianceExplainResult {
  narration: string;
  factors: AiNarrationFactor[];
  suggestedInvestigations: string[];
  evidenceSnapshot: Record<string, unknown>;
  generatedAt: string;
}

export interface ReconciliationExplainBody {
  matchId: number;
}

export interface ReconciliationExplainResult {
  narration: string;
  factors: AiNarrationFactor[];
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
  confidence: "high" | "medium" | "low";
  reviewRequired: true;
  warningMessage: string;
  generatedAt: string;
}

export function useExplainVariance() {
  return useMutation<VarianceExplainResult, Error, VarianceExplainBody>({
    mutationKey: ["streamlineos", "accounting", "ai", "variance-explain"],
    mutationFn: (body) =>
      apiClient.post<VarianceExplainResult>("/finance/ai/variance-explain", body),
  });
}

export function useExplainReconciliation() {
  return useMutation<ReconciliationExplainResult, Error, ReconciliationExplainBody>({
    mutationKey: ["streamlineos", "accounting", "ai", "reconciliation-explain"],
    mutationFn: (body) =>
      apiClient.post<ReconciliationExplainResult>("/finance/ai/reconciliation-explain", body),
  });
}

export function useExtractDocument() {
  return useMutation<ExtractDocumentResult, Error, ExtractDocumentBody>({
    mutationKey: ["streamlineos", "accounting", "ai", "extract-document"],
    mutationFn: (body) =>
      apiClient.post<ExtractDocumentResult>("/finance/ai/extract-document", body),
  });
}
