"use client";

import { keepPreviousData, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import type { OffsetPage } from "@/hooks/api/offset-page-schema";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";

const surveyFormListC = lazyContract(() =>
  import("./survey-forms-schema").then((m) => m.surveyFormListContract),
);
const surveyFormRowC = lazyContract(() =>
  import("./survey-forms-schema").then((m) => m.surveyFormRowContract),
);
const surveyTemplateListC = lazyContract(() =>
  import("./survey-forms-schema").then((m) => m.surveyTemplateListContract),
);
const surveyVersionRowC = lazyContract(() =>
  import("./survey-forms-schema").then((m) => m.surveyVersionRowContract),
);

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
  qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.surveys.all });
}

export function useSurveys(params?: ListSurveysParams) {
  return useGatedQuery("surveys:view", {
    queryKey: knowledgeAndSurveysQueryKeys.surveys.list(params as Record<string, unknown>),
    queryFn: async ({ signal }) =>
      (await apiClient.get<OffsetPage<SurveyForm>>("/surveys", params as Record<string, unknown>, signal, surveyFormListC)).items,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useSurvey(surveyId: number | undefined) {
  return useGatedQuery("surveys:view", {
    queryKey: knowledgeAndSurveysQueryKeys.surveys.detail(surveyId ?? -1),
    queryFn: ({ signal }) => apiClient.get<SurveyForm>(`/surveys/${surveyId}`, undefined, signal, surveyFormRowC),
    enabled: typeof surveyId === "number",
    staleTime: 15_000,
  });
}

export function useSurveyTemplates() {
  return useGatedQuery("surveys:view", {
    queryKey: knowledgeAndSurveysQueryKeys.surveys.templates(),
    queryFn: ({ signal }) => apiClient.get<SurveyTemplate[]>("/surveys/templates", undefined, signal, surveyTemplateListC),
    staleTime: 5 * 60_000,
  });
}

export function useCreateSurvey() {
  const qc = useQueryClient();
  return useAuthorizedMutation("surveys:create", {
    mutationKey: ["surveys", "create"] as const,
    mutationFn: (input: CreateSurveyInput) => apiClient.post<SurveyForm>("/surveys", input, undefined, surveyFormRowC),
    onSuccess: () => invalidateSurveyLists(qc),
  });
}

export function usePatchSurvey(surveyId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("surveys:update", {
    mutationKey: ["surveys", "patch", surveyId] as const,
    mutationFn: (input: PatchSurveyInput) => apiClient.patch<SurveyForm>(`/surveys/${surveyId}`, input, undefined, surveyFormRowC),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.surveys.detail(surveyId) });
      invalidateSurveyLists(qc);
    },
  });
}

function useSurveyLifecycleAction(action: "pause" | "close" | "archive") {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["surveys", action] as const,
    mutationFn: (surveyId: number) => apiClient.post<SurveyForm>(`/surveys/${surveyId}/${action}`, undefined, undefined, surveyFormRowC),
    onSuccess: (_, surveyId) => {
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.surveys.detail(surveyId) });
      invalidateSurveyLists(qc);
    },
  });
}

export function usePublishSurvey() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["surveys", "publish"] as const,
    mutationFn: (surveyId: number) => apiClient.post(`/surveys/${surveyId}/publish`, undefined, undefined, surveyVersionRowC),
    onSuccess: (_, surveyId) => {
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.surveys.detail(surveyId) });
      invalidateSurveyLists(qc);
    },
  });
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
  return useAuthorizedMutation("surveys:create", {
    mutationKey: ["surveys", "duplicate"] as const,
    mutationFn: (surveyId: number) => apiClient.post<SurveyForm>(`/surveys/${surveyId}/duplicate`, undefined, undefined, surveyFormRowC),
    onSuccess: () => invalidateSurveyLists(qc),
  });
}
