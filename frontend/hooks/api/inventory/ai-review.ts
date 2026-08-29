"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";

/* ------------------------------------------------------------------ *
 * F3 — the anomaly queue
 * ------------------------------------------------------------------ */

/** The six detectors. Mirrors the backend registry. */
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
  /** The arithmetic, in words, exactly as the query performs it. */
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
  /**
   * The window this finding was raised under, which may predate a threshold
   * change. Rendered instead of the registry's current window whenever the two
   * disagree — what the detector meant *then* is what the row claims.
   */
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
  /**
   * The reader's access is limited to specific warehouses, so organisation-wide
   * findings are excluded. A flag rather than a count — saying how many rows
   * somebody cannot see is still telling them something about those rows — but
   * it has to be said, or an honest gate reads as a broken screen.
   */
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

/**
 * Deterministic and unpaid — the queue is a database read, not a model call, so
 * it may load with the page.
 */
export function useInventoryAnomalies(filters?: InvAnomalyFilters) {
  const canView = useCan("inventory:ai:read");
  return useQuery<InvAnomalyPage, Error>({
    queryKey: queryKeys.inventoryAiReview.anomalies(filters),
    queryFn: () =>
      apiClient.get<InvAnomalyPage>("/inventory/ai/anomalies", {
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.type ? { type: filters.type } : {}),
        ...(filters?.severity ? { severity: filters.severity } : {}),
        ...(filters?.warehouseId !== undefined
          ? { warehouseId: String(filters.warehouseId) }
          : {}),
        ...(filters?.page !== undefined ? { page: String(filters.page) } : {}),
        ...(filters?.limit !== undefined ? { limit: String(filters.limit) } : {}),
      }),
    enabled: canView,
    staleTime: 60_000,
  });
}

/** What each detector claims and how. Static, so it is cached hard. */
export function useInventoryAnomalyDetectors() {
  const canView = useCan("inventory:ai:read");
  return useQuery<{ detectors: InvAnomalyDetector[] }, Error>({
    queryKey: queryKeys.inventoryAiReview.detectors,
    queryFn: () =>
      apiClient.get<{ detectors: InvAnomalyDetector[] }>("/inventory/ai/anomalies/detectors"),
    enabled: canView,
    staleTime: 30 * 60_000,
  });
}

export interface ReviewAnomalyInput {
  insightId: number;
  action: "acknowledge" | "dismiss";
  note?: string;
}

export function useReviewInventoryAnomaly() {
  const qc = useQueryClient();
  return useMutation<InvAnomalyRow, Error, ReviewAnomalyInput>({
    mutationKey: queryKeys.inventoryAiReview.review,
    mutationFn: ({ insightId, action, note }) =>
      apiClient.patch<InvAnomalyRow>(`/inventory/ai/anomalies/${insightId}/review`, {
        action,
        ...(note ? { note } : {}),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventoryAiReview.anomalies() });
    },
  });
}

/* ------------------------------------------------------------------ *
 * F3 — the demand-risk narrative
 * ------------------------------------------------------------------ */

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
  /**
   * Three states and they must render as three things. `ok` has prose over the
   * engine's figures. `facts_only` is the provider being unreachable — the
   * forecast is still there and still the organisation's best estimate.
   * `insufficient_evidence` is "there is no forecast to narrate", which is a
   * different claim entirely and must never be dressed up as "no risk found".
   */
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

/**
 * A mutation rather than a query, deliberately: narrating spends credits, so it
 * happens because a human pressed something and never behind a `staleTime` that
 * could refetch it on a window focus.
 */
export function useInventoryDemandRisk() {
  return useMutation<
    InvDemandRiskResult,
    Error,
    { variantId: number; warehouseId?: number }
  >({
    mutationKey: queryKeys.inventoryAiReview.demandRisk,
    mutationFn: (body) =>
      apiClient.post<InvDemandRiskResult>("/inventory/ai/demand-risk", body),
  });
}

/* ------------------------------------------------------------------ *
 * F6 — feedback on an AI answer
 * ------------------------------------------------------------------ */

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

/** The two verdicts that are a complaint, and therefore need a sentence. */
export const VERDICTS_REQUIRING_NOTE: readonly InvAiVerdict[] = ["WRONG", "UNSAFE"];
export const FEEDBACK_NOTE_MIN = 10;
export const FEEDBACK_NOTE_MAX = 1000;

export interface SubmitInvAiFeedbackInput {
  surface: InvAiSurface;
  verdict: InvAiVerdict;
  /** The gateway's id for the call being judged. */
  correlationId: string;
  promptKey: string;
  promptVersion: number;
  contractVersion: number;
  evidenceHash?: string;
  note?: string;
}

/**
 * Filing a verdict costs no credits: it reaches no provider. Only the
 * identifiers travel — the server reads what the call actually cost from the
 * gateway's own usage log rather than believing the browser.
 */
export function useSubmitInventoryAiFeedback() {
  const qc = useQueryClient();
  return useMutation<
    { id: number; verdict: InvAiVerdict; surface: string; createdAt: string },
    Error,
    SubmitInvAiFeedbackInput
  >({
    mutationKey: queryKeys.inventoryAiReview.feedback,
    mutationFn: (body) => apiClient.post("/inventory/ai/feedback", body),
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
    /** Excludes `unsafe` — an incident is not a low score. */
    usefulRatio: number | null;
  }>;
  unsafeTotal: number;
}

export function useInventoryAiFeedbackSummary(days = 30) {
  const canManage = useCan("inventory:ai:manage");
  return useQuery<InvAiFeedbackSummary, Error>({
    queryKey: queryKeys.inventoryAiReview.feedbackSummary({ days }),
    queryFn: () =>
      apiClient.get<InvAiFeedbackSummary>("/inventory/ai/feedback/summary", {
        days: String(days),
      }),
    enabled: canManage,
    staleTime: 5 * 60_000,
  });
}
