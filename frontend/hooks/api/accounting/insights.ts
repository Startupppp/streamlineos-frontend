"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export type AnomalySeverity = "info" | "warning" | "critical";

export interface AnomalyDrill {
  type: string;
  params: Record<string, string>;
}

export interface Anomaly {
  id: string;
  severity: AnomalySeverity;
  kind: string;
  title: string;
  detail: string;
  drill: AnomalyDrill;
}

export interface InsightsDigest {
  headline: string;
  positives: string[];
  watchouts: string[];
}

export interface CategorizeSuggestInput {
  merchant: string;
  amount?: number;
}

export interface CategorizeSuggestResult {
  categoryId: number;
  categoryName: string;
  confidence: number;
  basis: "history" | "none";
}

const insightKeys = {
  all: ["streamlineos", "accounting", "insights"] as const,
  anomalies: (params: Record<string, string>) =>
    [...insightKeys.all, "anomalies", params] as const,
  digest: () => [...insightKeys.all, "digest"] as const,
};

function toQuery(params: Record<string, string | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") out[k] = v;
  }
  return out;
}

export function useAnomalies(params: { from?: string; to?: string } = {}) {
  const query = toQuery(params);
  return useQuery<Anomaly[], Error>({
    queryKey: insightKeys.anomalies(query),
    queryFn: () => apiClient.get<Anomaly[]>("/accounting/insights/anomalies", query),
    staleTime: 300_000,
  });
}

export function useInsightsDigest() {
  return useQuery<InsightsDigest, Error>({
    queryKey: insightKeys.digest(),
    queryFn: () => apiClient.get<InsightsDigest>("/accounting/insights/digest"),
    staleTime: 300_000,
  });
}

export function useCategorizeSuggest() {
  return useMutation<CategorizeSuggestResult, Error, CategorizeSuggestInput>({
    mutationFn: (input) =>
      apiClient.post<CategorizeSuggestResult>("/accounting/expenses/categorize-suggest", input),
  });
}
