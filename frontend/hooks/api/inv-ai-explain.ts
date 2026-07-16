"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface ExplainFactor {
  label: string;
  value: string;
  isFactual: boolean;
}

export interface InsightNarration {
  explanation: string;
  factors: ExplainFactor[];
  suggestedActions: string[];
  evidenceSnapshot: Record<string, unknown>;
}

interface DigestSample {
  id: number;
  title: string;
  body: string;
  severity: string;
}

export interface DigestGroup {
  insightType: string;
  count: number;
  severityCounts: Record<string, number>;
  samples: DigestSample[];
}

export interface InventoryDigest {
  groups: DigestGroup[];
  totalNew: number;
  narration?: string;
}

export function useExplainInsight() {
  return useMutation<InsightNarration, Error, number>({
    mutationKey: ["inventory", "ai", "insight", "explain"],
    mutationFn: (insightId: number) =>
      apiClient.post<InsightNarration>(`/inventory/ai/insights/${insightId}/explain`),
  });
}

export function useInventoryDigest(narrate = false) {
  return useQuery<InventoryDigest, Error>({
    queryKey: queryKeys.inventory.aiDigest(narrate),
    queryFn: () =>
      apiClient.get<InventoryDigest>("/inventory/ai/digest", narrate ? { narrate: "true" } : {}),
    staleTime: 2 * 60_000,
  });
}
