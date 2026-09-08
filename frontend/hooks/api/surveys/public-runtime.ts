"use client";
import type { z } from "zod";
import type { surveyPublicSurveyContract } from "./survey-public-schema";

import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import type { AnswerValue } from "@/features/surveys/respondent/answer-value";

const surveyPublicSurveyC = lazyContract(() =>
  import("./survey-public-schema").then((m) => m.surveyPublicSurveyContract),
);
const surveyPublicSessionRowC = lazyContract(() =>
  import("./survey-public-schema").then((m) => m.surveyPublicSessionRowContract),
);
const publicSuccessC = lazyContract(() =>
  import("./survey-public-schema").then((m) => m.publicSuccessContract),
);

export interface PublicSurveyQuestionChoice {
  id: number;
  choiceKey: string;
  label: string;
  value: string | null;
  score: number | null;
  sortOrder: number;
  isCorrect: boolean;
}

export interface PublicSurveyQuestion {
  id: number;
  questionKey: string;
  variableName: string | null;
  type: string;
  title: string;
  description: string | null;
  required: boolean;
  settings: Record<string, unknown>;
  sortOrder: number;
  choices: PublicSurveyQuestionChoice[];
}

export interface PublicSurveySection {
  id: number;
  title: string;
  description: string | null;
  sortOrder: number;
  questions: PublicSurveyQuestion[];
}

export interface PublicSurveyLogicRule {
  id: number;
  sourceQuestionId: number;
  condition: { op: string; questionId?: number; value?: unknown };
  action: { type: string };
  target: Record<string, unknown> | null;
  sortOrder: number;
}

export type PublicSurveyResponse = z.infer<typeof surveyPublicSurveyContract>;

export interface StartSessionResponse {
  id: number;
  status: string;
}

export function usePublicSurvey(collectorToken: string) {
  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.surveys.publicSurvey(collectorToken),
    queryFn: ({ signal }) => apiClient.get<PublicSurveyResponse>(`/public/surveys/${collectorToken}`, undefined, signal, surveyPublicSurveyC),
    enabled: Boolean(collectorToken),
    retry: false,
    staleTime: 0,
  });
}

export function useStartSurveySession(collectorToken: string) {
  return useMutation({
    mutationKey: ["surveys", "public", "start", collectorToken] as const,
    mutationFn: (input: { accessToken?: string; participantEmail?: string; metadata?: Record<string, unknown> }) =>
      apiClient.post<StartSessionResponse>(`/public/surveys/${collectorToken}/start`, input, undefined, surveyPublicSessionRowC),
  });
}

export function useSaveSurveyAnswers(collectorToken: string, sessionId: number | undefined) {
  return useMutation({
    mutationKey: ["surveys", "public", "save", collectorToken, sessionId] as const,
    mutationFn: (answers: Array<{ questionId: number } & AnswerValue>) =>
      apiClient.patch(
        `/public/surveys/${collectorToken}/session/${sessionId}`,
        { answers },
        undefined,
        publicSuccessC,
      ),
  });
}

export function useSubmitSurveySession(collectorToken: string, sessionId: number | undefined) {
  return useMutation({
    mutationKey: ["surveys", "public", "submit", collectorToken, sessionId] as const,
    mutationFn: (answers?: Array<{ questionId: number } & AnswerValue>) =>
      apiClient.post<StartSessionResponse>(
        `/public/surveys/${collectorToken}/session/${sessionId}/submit`,
        { answers },
        undefined,
        surveyPublicSessionRowC,
      ),
  });
}
