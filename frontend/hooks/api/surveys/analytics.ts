"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient, authedFetch, buildUrl } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import type { OffsetPage } from "@/hooks/api/offset-page-schema";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { useGatedQuery } from "@/hooks/api/gated-query";

const surveyOverviewC = lazyContract(() =>
  import("./survey-analytics-schema").then((m) => m.surveyOverviewContract),
);
const surveyQuestionAnalyticsC = lazyContract(() =>
  import("./survey-analytics-schema").then((m) => m.surveyQuestionAnalyticsContract),
);
const surveyResponseListC = lazyContract(() =>
  import("./survey-analytics-schema").then((m) => m.surveyResponseListContract),
);
const surveyResponseDetailC = lazyContract(() =>
  import("./survey-analytics-schema").then((m) => m.surveyResponseDetailContract),
);

export interface SurveyAnalyticsOverview {
  totalResponses: number;
  submittedResponses: number;
  completionRate: number;
  averageCompletionTimeSeconds: number | null;
  averageScore: number | null;
  totalParticipants: number;
}

export interface QuestionChoiceCount {
  choiceId: number;
  label: string;
  count: number;
}

export interface QuestionAnalytics {
  questionId: number;
  type: string;
  title: string;
  responseCount: number;
  average: number | null;
  choiceDistribution: QuestionChoiceCount[];
  textResponses?: (string | null)[];
}

export interface SurveyResponseSession {
  id: number;
  surveyId: number;
  versionId: number;
  collectorId: number | null;
  participantId: number | null;
  status: string;
  anonymous: boolean;
  startedAt: string;
  submittedAt: string | null;
  durationSeconds: number | null;
  score: number | null;
  passed: boolean | null;
  segment: string | null;
}

export interface SurveyResponseAnswer {
  id: number;
  questionId: number;
  answerValue: unknown;
  answerText: string | null;
  choiceIds: number[] | null;
  score: number | null;
  answeredAt: string;
  question?: { id: number; title: string; type: string; choices: Array<{ id: number; label: string }> };
}

export interface ListResponsesParams {
  collectorId?: number;
  status?: string;
  page?: number;
  pageSize?: number;
}

export function useAnalyticsOverview(surveyId: number) {
  return useGatedQuery("surveys:analytics:view", {
    queryKey: knowledgeAndSurveysQueryKeys.surveys.analyticsOverview(surveyId),
    queryFn: ({ signal }) => apiClient.get<SurveyAnalyticsOverview>(`/surveys/${surveyId}/analytics/overview`, undefined, signal, surveyOverviewC),
    staleTime: 15_000,
  });
}

export function useQuestionAnalytics(surveyId: number) {
  return useGatedQuery("surveys:analytics:view", {
    queryKey: knowledgeAndSurveysQueryKeys.surveys.analyticsQuestions(surveyId),
    queryFn: ({ signal }) => apiClient.get<QuestionAnalytics[]>(`/surveys/${surveyId}/analytics/questions`, undefined, signal, surveyQuestionAnalyticsC),
    staleTime: 15_000,
  });
}

export function useSurveyResponses(surveyId: number, params?: ListResponsesParams) {
  return useGatedQuery("surveys:responses:view", {
    queryKey: knowledgeAndSurveysQueryKeys.surveys.responses(surveyId, params),
    queryFn: async ({ signal }) =>
      (await apiClient.get<OffsetPage<SurveyResponseSession>>(`/surveys/${surveyId}/responses`, params, signal, surveyResponseListC)).items,
    staleTime: 15_000,
  });
}

export function useSurveyResponse(surveyId: number, sessionId: number | undefined) {
  return useGatedQuery("surveys:responses:view", {
    queryKey: knowledgeAndSurveysQueryKeys.surveys.response(surveyId, sessionId ?? -1),
    queryFn: ({ signal }) =>
      apiClient.get<{ session: SurveyResponseSession; answers: SurveyResponseAnswer[] }>(
        `/surveys/${surveyId}/responses/${sessionId}`, undefined, signal, surveyResponseDetailC,
      ),
    enabled: typeof sessionId === "number",
    staleTime: 15_000,
  });
}

export function useExportResponses(surveyId: number) {
  return useMutation({
    mutationKey: ["surveys", "export", surveyId] as const,
    mutationFn: async (params?: { collectorId?: number; status?: string }) => {
      const url = `/surveys/${surveyId}/export`;
      const res = await authedFetch(
        buildUrl(url),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ format: "csv", ...params }),
        },
        url,
      );
      if (!res.ok) throw new Error(`Export failed: ${res.status} ${res.statusText}`);
      return res.blob();
    },
  });
}
