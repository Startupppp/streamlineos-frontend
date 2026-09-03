"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";

export type CollectorType =
  | "public_link"
  | "email"
  | "qr"
  | "embed"
  | "popup"
  | "crm_campaign"
  | "hr_audience"
  | "support_trigger"
  | "live_session"
  | "manual_access_code";

export type CollectorStatus = "active" | "paused" | "closed" | "expired";

export interface SurveyCollector {
  id: number;
  collectorType: CollectorType;
  name: string;
  token: string;
  status: CollectorStatus;
  source: string | null;
  utm: Record<string, unknown>;
  settings: Record<string, unknown>;
  opens: number;
  starts: number;
  completions: number;
  expiresAt: string | null;
  createdAt: string;
}

export interface CreateCollectorInput {
  collectorType: CollectorType;
  name: string;
  source?: string;
  expiresAt?: string;
}

export interface PatchCollectorInput {
  name?: string;
  status?: CollectorStatus;
  expiresAt?: string | null;
}

export function useCollectors(surveyId: number) {
  return useGatedQuery("surveys:participants:view", {
    queryKey: queryKeys.surveys.collectors(surveyId),
    queryFn: ({ signal }) => apiClient.get<SurveyCollector[]>(`/surveys/${surveyId}/collectors`, undefined, signal),
    staleTime: 15_000,
  });
}

export function useCreateCollector(surveyId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("surveys:participants:manage", {
    mutationKey: ["surveys", "collectors", "create", surveyId] as const,
    mutationFn: (input: CreateCollectorInput) => apiClient.post<SurveyCollector>(`/surveys/${surveyId}/collectors`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.surveys.collectors(surveyId) }),
  });
}

export function usePatchCollector(surveyId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("surveys:participants:manage", {
    mutationKey: ["surveys", "collectors", "patch", surveyId] as const,
    mutationFn: ({ collectorId, input }: { collectorId: number; input: PatchCollectorInput }) =>
      apiClient.patch<SurveyCollector>(`/surveys/${surveyId}/collectors/${collectorId}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.surveys.collectors(surveyId) }),
  });
}
