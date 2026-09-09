"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useIdempotentMutation } from "./use-idempotent-mutation";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { AiInsight } from "./reports";

interface InsightsParams {
  status?: "NEW" | "ACKNOWLEDGED" | "DISMISSED";
  type?: string;
  page?: number;
  limit?: number;
}

interface InsightsPaginatedResponse {
  items: AiInsight[];
  total: number;
  page: number;
  totalPages: number;
}

interface UpdateInsightInput {
  status: "ACKNOWLEDGED" | "DISMISSED";
}

export function useInventoryInsights(params?: InsightsParams) {
  const canView = useCan("inventory:ai:read");
  return useQuery<InsightsPaginatedResponse, Error>({
    queryKey: queryKeys.inventory.aiInsights(params),
    queryFn: () =>
      apiClient.get<InsightsPaginatedResponse>("/inventory/ai/insights", {
        ...(params?.status ? { status: params.status } : {}),
        ...(params?.type ? { type: params.type } : {}),
        ...(params?.page !== undefined ? { page: String(params.page) } : {}),
        ...(params?.limit !== undefined ? { limit: String(params.limit) } : {}),
      }),
    staleTime: 2 * 60_000,
    enabled: canView,
  });
}

export function useGenerateInsights() {
  const qc = useQueryClient();
  return useIdempotentMutation<unknown, Error, void>({
    mutationKey: ["inventory", "ai", "insights", "generate"],
    mutationFn: (_variables, idempotencyKey) => apiClient.post("/inventory/ai/insights/generate", undefined, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.aiInsights() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.dashboard() });
    },
  });
}

export function useUpdateInsight() {
  const qc = useQueryClient();
  return useMutation<AiInsight, Error, { insightId: number; data: UpdateInsightInput }>({
    mutationKey: ["inventory", "ai", "insight", "update"],
    mutationFn: ({ insightId, data }) =>
      apiClient.patch<AiInsight>(`/inventory/ai/insights/${insightId}`, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.aiInsights() });
    },
  });
}

/* ------------------------------------------------------------------ *
 * F2 — the inventory copilot
 * ------------------------------------------------------------------ */

/** The seven reads the copilot can perform. Mirrors the backend allowlist. */
export type InvCopilotToolName =
  | "current_stock"
  | "available_to_promise"
  | "recent_movements"
  | "open_purchase_orders"
  | "active_reservations"
  | "expiring_lots"
  | "vendor_delay";

export interface InvCopilotToolResult {
  tool: InvCopilotToolName;
  /** Server-authored section heading. Never model text. */
  label: string;
  columns: string[];
  rows: Array<Record<string, string | number | null>>;
  rowCount: number;
  /** The query found more than the cap, so the table is a sample. */
  truncated: boolean;
  evidence: Array<{ kind: string; id: number }>;
}

export interface InvCopilotAnswer {
  /**
   * Three states, and they must render as three things.
   *
   * `answered` has prose over the tables. `facts_only` is the provider being
   * unreachable — the tables are still there and still true, and the page is
   * useful without the narration. `no_context` is "there is nothing here you
   * can see", which is a different claim entirely and must never be dressed up
   * as an empty answer.
   */
  status: "answered" | "facts_only" | "no_context";
  question: string;
  narration: string | null;
  tools: InvCopilotToolResult[];
  plannedBy: "model" | "deterministic";
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

export interface InvCopilotAskInput {
  question: string;
  variantId?: number;
  warehouseId?: number;
  vendorId?: number;
}

/**
 * A mutation rather than a query, deliberately. Asking may spend credits, so it
 * happens because a human pressed something — no page render reaches it, and it
 * never sits behind a `staleTime` that could refetch it on a window focus.
 */
export function useInventoryCopilotAsk() {
  return useMutation<InvCopilotAnswer, Error, InvCopilotAskInput>({
    mutationKey: queryKeys.inventoryCopilot.ask,
    mutationFn: (body) =>
      apiClient.post<InvCopilotAnswer>("/inventory/ai/copilot/ask", body),
  });
}
