"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthorizedIdempotentMutation } from "./use-idempotent-mutation";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
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
  const canView = useCan("inventory:reports:read");
  return useQuery<InsightsPaginatedResponse, Error>({
    queryKey: queryKeys.inventory.aiInsights(params),
    queryFn: ({ signal }) =>
      apiClient.get<InsightsPaginatedResponse>("/inventory/ai/insights", {
        ...(params?.status ? { status: params.status } : {}),
        ...(params?.type ? { type: params.type } : {}),
        ...(params?.page !== undefined ? { page: String(params.page) } : {}),
        ...(params?.limit !== undefined ? { limit: String(params.limit) } : {}),
      }, signal),
    staleTime: 2 * 60_000,
    enabled: canView,
  });
}

export function useGenerateInsights() {
  const qc = useQueryClient();
  return useAuthorizedIdempotentMutation<unknown, Error, void>("inventory:ai:manage", {
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
  return useAuthorizedMutation<AiInsight, Error, { insightId: number; data: UpdateInsightInput }>("inventory:ai:manage", {
    mutationKey: ["inventory", "ai", "insight", "update"],
    mutationFn: ({ insightId, data }) =>
      apiClient.patch<AiInsight>(`/inventory/ai/insights/${insightId}`, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.aiInsights() });
    },
  });
}


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
  label: string;
  columns: string[];
  rows: Array<Record<string, string | number | null>>;
  rowCount: number;
  truncated: boolean;
  evidence: Array<{ kind: string; id: number }>;
}

export interface InvCopilotAnswer {
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

export function useInventoryCopilotAsk() {
  return useAuthorizedMutation<InvCopilotAnswer, Error, InvCopilotAskInput>("inventory:ai:read", {
    mutationKey: queryKeys.inventoryCopilot.ask,
    mutationFn: (body) =>
      apiClient.post<InvCopilotAnswer>("/inventory/ai/copilot/ask", body),
  });
}
