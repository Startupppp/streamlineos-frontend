"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { AiInsight } from "./reports";
import { lazyContract } from "@/lib/api-envelope";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const listInsightsContract = lazyContract(() =>
  import("@/hooks/api/inventory/ai-schema").then((m) => m.listInsightsContract),
);
const updateInsightStatusContract = lazyContract(() =>
  import("@/hooks/api/inventory/ai-schema").then((m) => m.updateInsightStatusContract),
);
const generateInsightsContract = lazyContract(() =>
  import("@/hooks/api/inventory/ai-schema").then((m) => m.generateInsightsContract),
);

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
      }, signal, listInsightsContract),
    staleTime: 2 * 60_000,
    enabled: canView,
  });
}

export function useGenerateInsights() {
  const qc = useQueryClient();
  return useAuthorizedMutation<{ generated: number }, Error, void>("inventory:ai:manage", {
    mutationKey: ["inventory", "ai", "insights", "generate"],
    mutationFn: () =>
      apiClient.post<{ generated: number }>(
        "/inventory/ai/insights/generate",
        undefined,
        undefined,
        generateInsightsContract,
      ),
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
      apiClient.patch<AiInsight>(`/inventory/ai/insights/${insightId}`, data, undefined, updateInsightStatusContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.aiInsights() });
    },
  });
}
