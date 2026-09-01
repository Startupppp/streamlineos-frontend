"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export type SurveyMode = "survey" | "assessment" | "live_session" | "lead_qualification" | "custom";
export type SurveyStatus = "draft" | "testing" | "published" | "paused" | "closed" | "archived";

export interface SurveyForm {
  id: number;
  orgId: string;
  title: string;
  description: string | null;
  mode: SurveyMode;
  status: SurveyStatus;
  ownerUserId: string | null;
  defaultLanguage: string;
  activeVersionId: number | null;
  settings: Record<string, unknown>;
  branding: Record<string, unknown>;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface ListSurveysParams {
  status?: SurveyStatus;
  mode?: SurveyMode;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateSurveyInput {
  title: string;
  description?: string;
  mode?: SurveyMode;
  defaultLanguage?: string;
  templateKey?: string;
}

export interface PatchSurveyInput {
  title?: string;
  description?: string | null;
  ownerUserId?: string | null;
  defaultLanguage?: string;
  settings?: Record<string, unknown>;
  branding?: Record<string, unknown>;
}

export interface SurveyTemplateQuestionChoice {
  choiceKey: string;
  label: string;
  value?: string;
  score?: number;
  isCorrect?: boolean;
}

export interface SurveyTemplateQuestion {
  type: string;
  title: string;
  required?: boolean;
  settings?: Record<string, unknown>;
  choices?: SurveyTemplateQuestionChoice[];
}

export interface SurveyTemplate {
  key: string;
  name: string;
  description: string;
  mode: SurveyMode;
  category: string;
  sections: Array<{ title: string; questions: SurveyTemplateQuestion[] }>;
}

function invalidateSurveyLists(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: queryKeys.surveys.all });
}

export function useSurveys(params?: ListSurveysParams) {
  return useQuery({
    queryKey: queryKeys.surveys.list(params as Record<string, unknown>),
    queryFn: ({ signal }) => apiClient.get<SurveyForm[]>("/surveys", params as Record<string, unknown>, signal),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useSurvey(surveyId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.surveys.detail(surveyId ?? -1),
    queryFn: ({ signal }) => apiClient.get<SurveyForm>(`/surveys/${surveyId}`, undefined, signal),
    enabled: typeof surveyId === "number",
    staleTime: 15_000,
  });
}

export function useSurveyTemplates() {
  return useQuery({
    queryKey: queryKeys.surveys.templates(),
    queryFn: ({ signal }) => apiClient.get<SurveyTemplate[]>("/surveys/templates", undefined, signal),
    staleTime: 5 * 60_000,
  });
}

export function useCreateSurvey() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["surveys", "create"] as const,
    mutationFn: (input: CreateSurveyInput) => apiClient.post<SurveyForm>("/surveys", input),
    onSuccess: () => invalidateSurveyLists(qc),
  });
}

export function usePatchSurvey(surveyId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["surveys", "patch", surveyId] as const,
    mutationFn: (input: PatchSurveyInput) => apiClient.patch<SurveyForm>(`/surveys/${surveyId}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.surveys.detail(surveyId) });
      invalidateSurveyLists(qc);
    },
  });
}

function useSurveyLifecycleAction(action: "publish" | "pause" | "close" | "archive") {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["surveys", action] as const,
    mutationFn: (surveyId: number) => apiClient.post<SurveyForm>(`/surveys/${surveyId}/${action}`),
    onSuccess: (_, surveyId) => {
      qc.invalidateQueries({ queryKey: queryKeys.surveys.detail(surveyId) });
      invalidateSurveyLists(qc);
    },
  });
}

export function usePublishSurvey() {
  return useSurveyLifecycleAction("publish");
}

export function usePauseSurvey() {
  return useSurveyLifecycleAction("pause");
}

export function useCloseSurvey() {
  return useSurveyLifecycleAction("close");
}

export function useArchiveSurvey() {
  return useSurveyLifecycleAction("archive");
}

export function useDuplicateSurvey() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["surveys", "duplicate"] as const,
    mutationFn: (surveyId: number) => apiClient.post<SurveyForm>(`/surveys/${surveyId}/duplicate`),
    onSuccess: () => invalidateSurveyLists(qc),
  });
}
