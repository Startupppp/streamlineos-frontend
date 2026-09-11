"use client";
import type { z } from "zod";
import type { surveyCollectorRowContract } from "./survey-collectors-schema";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";

const surveyCollectorListC = lazyContract(() =>
  import("./survey-collectors-schema").then((m) => m.surveyCollectorListContract),
);
const surveyCollectorRowC = lazyContract(() =>
  import("./survey-collectors-schema").then((m) => m.surveyCollectorRowContract),
);

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

export type SurveyCollector = z.infer<typeof surveyCollectorRowContract>;

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
    queryKey: knowledgeAndSurveysQueryKeys.surveys.collectors(surveyId),
    queryFn: ({ signal }) => apiClient.get<SurveyCollector[]>(`/surveys/${surveyId}/collectors`, undefined, signal, surveyCollectorListC),
    staleTime: 15_000,
  });
}

export function useCreateCollector(surveyId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("surveys:participants:manage", {
    mutationKey: ["surveys", "collectors", "create", surveyId] as const,
    mutationFn: (input: CreateCollectorInput) => apiClient.post<SurveyCollector>(`/surveys/${surveyId}/collectors`, input, undefined, surveyCollectorRowC),
    onSuccess: () => qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.surveys.collectors(surveyId) }),
  });
}

export function usePatchCollector(surveyId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("surveys:participants:manage", {
    mutationKey: ["surveys", "collectors", "patch", surveyId] as const,
    mutationFn: ({ collectorId, input }: { collectorId: number; input: PatchCollectorInput }) =>
      apiClient.patch<SurveyCollector>(`/surveys/${surveyId}/collectors/${collectorId}`, input, undefined, surveyCollectorRowC),
    onSuccess: () => qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.surveys.collectors(surveyId) }),
  });
}
