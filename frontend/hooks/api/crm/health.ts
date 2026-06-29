"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

type HealthStatus = "healthy" | "at_risk" | "critical";

export interface HealthScoreBreakdown {
  sla: number;
  csat: number;
  activity: number;
  renewal: number;
  tickets: number;
}

export interface HealthScoreWeights {
  sla: number;
  csat: number;
  activity: number;
  renewal: number;
  tickets: number;
}

export interface HealthScoreThresholds {
  healthy: number;
  atRisk: number;
}

export interface HealthScoreItem {
  clientAccountId: number;
  clientName: string;
  score: number;
  status: HealthStatus;
  breakdown: HealthScoreBreakdown;
  computedAt: string;
}

interface HealthScoresSummary {
  healthy: number;
  atRisk: number;
  critical: number;
  total: number;
  avgScore: number;
}

interface HealthScoresResponse {
  items: HealthScoreItem[];
  summary: HealthScoresSummary;
}

interface HealthConfigResponse {
  weights: HealthScoreWeights;
  thresholds: HealthScoreThresholds;
  isDefault: boolean;
}

interface UpdateHealthConfigInput {
  weights: HealthScoreWeights;
  thresholds: HealthScoreThresholds;
}

interface RecomputeHealthResponse {
  healthy: number;
  atRisk: number;
  critical: number;
  total: number;
  avgScore: number;
}

export function useHealthScores(params?: { status?: HealthStatus }) {
  return useQuery({
    queryKey: queryKeys.csHealth.scores(params as Record<string, unknown> | undefined),
    queryFn: () =>
      apiClient.get<HealthScoresResponse>("/customer-executive/health", params as Record<string, unknown>),
    staleTime: 2 * 60_000,
  });
}

export function useHealthConfig() {
  return useQuery({
    queryKey: queryKeys.csHealth.config(),
    queryFn: () => apiClient.get<HealthConfigResponse>("/customer-executive/health/config"),
    staleTime: 5 * 60_000,
  });
}

export function useUpdateHealthConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateHealthConfigInput) =>
      apiClient.put<{ weights: HealthScoreWeights; thresholds: HealthScoreThresholds }>(
        "/customer-executive/health/config",
        input,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.csHealth.config() });
    },
  });
}

export function useRecomputeHealth() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<RecomputeHealthResponse>("/customer-executive/health/recompute", {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.csHealth.all });
    },
  });
}
