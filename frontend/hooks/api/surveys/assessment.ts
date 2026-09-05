"use client";

import { apiClient } from "@/lib/api-client";
import type { OffsetPage } from "@/hooks/api/offset-page-schema";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { useGatedQuery } from "@/hooks/api/gated-query";

export type AssessmentAttemptStatus = "not_started" | "in_progress" | "submitted" | "passed" | "failed" | "expired";

export interface SurveyAssessmentAttempt {
  id: number;
  participantId: number | null;
  sessionId: number | null;
  attemptNumber: number;
  status: AssessmentAttemptStatus;
  score: number | null;
  passed: boolean | null;
  startedAt: string | null;
  submittedAt: string | null;
  expiresAt: string | null;
}

export interface SurveyCertificate {
  id: number;
  participantId: number;
  attemptId: number;
  certificateNumber: string;
  issuedAt: string;
  expiresAt: string | null;
  fileUrl: string | null;
}

export function useAssessmentAttempts(surveyId: number, params?: { status?: AssessmentAttemptStatus; page?: number; pageSize?: number }) {
  return useGatedQuery("surveys:assessments:manage", {
    queryKey: knowledgeAndSurveysQueryKeys.surveys.assessmentAttempts(surveyId, params as Record<string, unknown>),
    queryFn: async ({ signal }) =>
      (await apiClient.get<OffsetPage<SurveyAssessmentAttempt>>(`/surveys/${surveyId}/assessment/attempts`, params as Record<string, unknown>, signal)).items,
    staleTime: 15_000,
  });
}

export function useSurveyCertificates(surveyId: number) {
  return useGatedQuery("surveys:assessments:manage", {
    queryKey: knowledgeAndSurveysQueryKeys.surveys.certificates(surveyId),
    queryFn: ({ signal }) => apiClient.get<SurveyCertificate[]>(`/surveys/${surveyId}/certificates`, undefined, signal),
    staleTime: 15_000,
  });
}
