"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

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
  return useQuery({
    queryKey: queryKeys.surveys.assessmentAttempts(surveyId, params as Record<string, unknown>),
    queryFn: () => apiClient.get<SurveyAssessmentAttempt[]>(`/surveys/${surveyId}/assessment/attempts`, params as Record<string, unknown>),
    staleTime: 15_000,
  });
}

export function useSurveyCertificates(surveyId: number) {
  return useQuery({
    queryKey: queryKeys.surveys.certificates(surveyId),
    queryFn: () => apiClient.get<SurveyCertificate[]>(`/surveys/${surveyId}/certificates`),
    staleTime: 15_000,
  });
}
