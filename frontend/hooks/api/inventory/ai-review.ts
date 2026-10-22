"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useIdempotentMutation } from "@/hooks/api/inventory/use-idempotent-mutation";
import { lazyContract } from "@/lib/api-envelope";

const anomalyPageResponse = lazyContract(() =>
  import("./restored-surfaces-schema").then((m) => m.anomalyPageContract),
);
const anomalyResponse = lazyContract(() =>
  import("./restored-surfaces-schema").then((m) => m.anomalyContract),
);
const demandRiskResponse = lazyContract(() =>
  import("./restored-surfaces-schema").then((m) => m.demandRiskContract),
);
const feedbackResponse = lazyContract(() =>
  import("./restored-surfaces-schema").then((m) => m.feedbackContract),
);
const feedbackSummaryResponse = lazyContract(() =>
  import("./restored-surfaces-schema").then((m) => m.feedbackSummaryContract),
);


export type InvAnomalyType =
  | "stockout_risk"
  | "dead_stock"
  | "vendor_delay"
  | "negative_stock"
  | "unusual_adjustments"
  | "expiry_risk";

export interface InvAnomalyDetector {
  type: InvAnomalyType;
  label: string;
  formula: string;
  windowDays: number | null;
  windowLabel: string;
  severityRule: string;
  evidenceKinds: string[];
  href: string;
  siteAttributable: boolean;
}

export interface InvAnomalyRow {
  id: number;
  type: string;
  severity: string;
  status: "NEW" | "ACKNOWLEDGED" | "DISMISSED";
  title: string;
  body: string;
  warehouseId: number | null;
  windowDays: number | null;
  evidenceHash: string | null;
  evidence: Array<{ kind: string; id: number }>;
  detector: Pick<
    InvAnomalyDetector,
    "type" | "label" | "formula" | "windowLabel" | "severityRule" | "href"
  > | null;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  resolutionNote: string | null;
  createdAt: string;
}

export interface InvAnomalyPage {
  items: InvAnomalyRow[];
  total: number;
  page: number;
  totalPages: number;
  orgWideSignalsHidden: boolean;
}

export interface InvAnomalyFilters {
  status?: "NEW" | "ACKNOWLEDGED" | "DISMISSED";
  type?: InvAnomalyType;
  severity?: "high" | "medium" | "low";
  warehouseId?: number;
  page?: number;
  limit?: number;
}

export function useInventoryAnomalies(filters?: InvAnomalyFilters) {
  const canView = useCan("inventory:ai:read");
  return useQuery<InvAnomalyPage, Error>({
    queryKey: queryKeys.inventoryAiReview.anomalies(filters),
    queryFn: ({ signal }) =>
      apiClient.get<InvAnomalyPage>("/inventory/ai/anomalies", {
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.type ? { type: filters.type } : {}),
        ...(filters?.severity ? { severity: filters.severity } : {}),
        ...(filters?.warehouseId !== undefined
          ? { warehouseId: String(filters.warehouseId) }
          : {}),
        ...(filters?.page !== undefined ? { page: String(filters.page) } : {}),
        ...(filters?.limit !== undefined ? { limit: String(filters.limit) } : {}),
      }, signal, anomalyPageResponse),
    enabled: canView,
    staleTime: 60_000,
  });
}

export interface ReviewAnomalyInput {
  insightId: number;
  action: "acknowledge" | "dismiss";
  note?: string;
}

export function useReviewInventoryAnomaly() {
  const qc = useQueryClient();
  return useAuthorizedMutation<InvAnomalyRow, Error, ReviewAnomalyInput>("inventory:ai:manage", {
    mutationKey: queryKeys.inventoryAiReview.review,
    mutationFn: ({ insightId, action, note }) =>
      apiClient.patch<InvAnomalyRow>(`/inventory/ai/anomalies/${insightId}/review`, {
        action,
        ...(note ? { note } : {}),
      }, undefined, anomalyResponse),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventoryAiReview.anomalies() });
    },
  });
}


export interface InvDemandRiskCoverage {
  from: string;
  to: string;
  periods: number;
  historyWeeks: number;
  horizonWeeks: number;
}

export interface InvDemandRiskUncertainty {
  method: string | null;
  demandCategory: string;
  mae: string | null;
  rmse: string | null;
  bias: string | null;
  mase: string | null;
  demandMean: string;
  demandStdDev: string;
  serviceLevel: string;
  z: string | null;
  applicable: boolean;
  refusalReason: string | null;
  safetyStock: string | null;
  reorderPoint: string | null;
  leadTimeDemand: string | null;
  censoredPeriods: number;
  stockoutCensored: boolean;
  censoringNote: string | null;
  shapeNote: string | null;
}

export interface InvDemandRiskResult {
  status: "ok" | "insufficient_evidence" | "facts_only";
  productVariantId: number;
  warehouseId: number | null;
  coverage: InvDemandRiskCoverage | null;
  uncertainty: InvDemandRiskUncertainty | null;
  forecastId: number | null;
  forecastGeneratedAt: string | null;
  narration: string | null;
  factors: Array<{ label: string; value: string; isFactual: boolean }>;
  actions: Array<{
    action: string;
    label: string;
    href: string | null;
    permission: string;
    mutates: boolean;
    rationale: string;
  }>;
  missing: string[];
  evidence: Array<{ kind: string; id: number }>;
  provenance: {
    contractVersion: number;
    promptKey: string;
    promptVersion: number;
    model: string;
    correlationId: string;
  } | null;
  aiUsage?: {
    model?: string | null;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    credits: number;
    costUsd?: number | null;
  };
  generatedAt: string;
}

export function useInventoryDemandRisk() {
  return useAuthorizedMutation<
    InvDemandRiskResult,
    Error,
    { variantId: number; warehouseId?: number }
  >("inventory:ai:read", {
    mutationKey: queryKeys.inventoryAiReview.demandRisk,
    mutationFn: (body) =>
      apiClient.post<InvDemandRiskResult>("/inventory/ai/demand-risk", body, undefined, demandRiskResponse),
  });
}


export type InvAiSurface =
  | "ops_brief"
  | "insight_explain"
  | "anomaly_queue"
  | "demand_risk"
  | "report_builder"
  | "copilot"
  | "reorder_proposal"
  | "supplier_delay"
  | "digest";

export type InvAiVerdict = "USEFUL" | "WRONG" | "STALE" | "UNSAFE";

export const VERDICTS_REQUIRING_NOTE: readonly InvAiVerdict[] = ["WRONG", "UNSAFE"];
export const FEEDBACK_NOTE_MIN = 10;
export const FEEDBACK_NOTE_MAX = 1000;

export interface SubmitInvAiFeedbackInput {
  surface: InvAiSurface;
  verdict: InvAiVerdict;
  correlationId: string;
  promptKey: string;
  promptVersion: number;
  contractVersion: number;
  evidenceHash?: string;
  note?: string;
}

export function useSubmitInventoryAiFeedback() {
  const qc = useQueryClient();
  return useIdempotentMutation<
    { id: number; verdict: InvAiVerdict; surface: string; createdAt: string },
    Error,
    SubmitInvAiFeedbackInput
  >({
    mutationKey: queryKeys.inventoryAiReview.feedback,
    mutationFn: (body, idempotencyKey) =>
      apiClient.post("/inventory/ai/feedback", body, {
        headers: { "Idempotency-Key": idempotencyKey },
      }, feedbackResponse),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: queryKeys.inventoryAiReview.feedbackSummary(),
      });
    },
  });
}

export interface InvAiFeedbackSummary {
  days: number;
  surfaces: Array<{
    surface: string;
    useful: number;
    wrong: number;
    stale: number;
    unsafe: number;
    total: number;
    usefulRatio: number | null;
  }>;
  unsafeTotal: number;
}

export function useInventoryAiFeedbackSummary(days = 30) {
  const canManage = useCan("inventory:ai:manage");
  return useQuery<InvAiFeedbackSummary, Error>({
    queryKey: queryKeys.inventoryAiReview.feedbackSummary({ days }),
    queryFn: ({ signal }) =>
      apiClient.get<InvAiFeedbackSummary>("/inventory/ai/feedback/summary", {
        days: String(days),
      }, signal, feedbackSummaryResponse),
    enabled: canManage,
    staleTime: 5 * 60_000,
  });
}
