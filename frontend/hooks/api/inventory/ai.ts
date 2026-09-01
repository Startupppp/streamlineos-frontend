"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
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
  return useMutation<unknown, Error, void>({
    mutationKey: ["inventory", "ai", "insights", "generate"],
    mutationFn: () => apiClient.post("/inventory/ai/insights/generate"),
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
