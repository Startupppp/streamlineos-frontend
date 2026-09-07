"use client";
import type { z } from "zod";
import type { surveyQuestionRowContract } from "./survey-builder-schema";
import type { surveySectionRowContract } from "./survey-builder-schema";
import type { surveyBuilderSnapshotContract } from "./survey-builder-schema";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import type { SurveyQuestionType } from "@/features/surveys/shared/question-type-meta";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const surveyBuilderSnapshotC = lazyContract(() =>
  import("./survey-builder-schema").then((m) => m.surveyBuilderSnapshotContract),
);
const surveySectionRowC = lazyContract(() =>
  import("./survey-builder-schema").then((m) => m.surveySectionRowContract),
);
const surveyQuestionRowC = lazyContract(() =>
  import("./survey-builder-schema").then((m) => m.surveyQuestionRowContract),
);
const builderSuccessC = lazyContract(() =>
  import("./survey-builder-schema").then((m) => m.builderSuccessContract),
);

export interface SurveyBuilderChoice {
  id: number;
  choiceKey: string;
  label: string;
  value: string | null;
  score: number | null;
  sortOrder: number;
  isCorrect: boolean;
}

export type SurveyBuilderQuestion = z.infer<typeof surveyQuestionRowContract>;

export type SurveyBuilderSection = z.infer<typeof surveySectionRowContract>;

export interface SurveyBuilderLogicRule {
  id: number;
  sourceQuestionId: number;
  condition: Record<string, unknown>;
  action: Record<string, unknown>;
  target: Record<string, unknown> | null;
  sortOrder: number;
}

export type SurveyBuilderData = z.infer<typeof surveyBuilderSnapshotContract>;

export interface ChoiceInput {
  choiceKey: string;
  label: string;
  value?: string;
  score?: number;
  isCorrect?: boolean;
}

export interface CreateSectionInput {
  title: string;
  description?: string;
  sortOrder?: number;
}

export type PatchSectionInput = Partial<CreateSectionInput>;

export interface CreateQuestionInput {
  sectionId: number;
  type: SurveyQuestionType;
  title: string;
  description?: string;
  required?: boolean;
  variableName?: string;
  settings?: Record<string, unknown>;
  validation?: Record<string, unknown>;
  scoring?: Record<string, unknown>;
  sortOrder?: number;
  choices?: ChoiceInput[];
}

export type PatchQuestionInput = Partial<Omit<CreateQuestionInput, "sectionId">> & { sectionId?: number };

export interface ReorderInput {
  sections?: Array<{ id: number; sortOrder: number }>;
  questions?: Array<{ id: number; sectionId: number; sortOrder: number }>;
}

function useInvalidateBuilder(surveyId: number) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.surveys.builder(surveyId) });
}

export function useSurveyBuilder(surveyId: number | undefined) {
  return useGatedQuery("surveys:view", {
    queryKey: knowledgeAndSurveysQueryKeys.surveys.builder(surveyId ?? -1),
    queryFn: ({ signal }) => apiClient.get<SurveyBuilderData>(`/surveys/${surveyId}/builder`, undefined, signal, surveyBuilderSnapshotC),
    enabled: typeof surveyId === "number",
    staleTime: 10_000,
  });
}

export function useCreateSection(surveyId: number) {
  const invalidate = useInvalidateBuilder(surveyId);
  return useAuthorizedMutation("surveys:update", {
    mutationKey: ["surveys", "sections", "create", surveyId] as const,
    mutationFn: (input: CreateSectionInput) => apiClient.post<SurveyBuilderSection>(`/surveys/${surveyId}/sections`, input, undefined, surveySectionRowC),
    onSuccess: invalidate,
  });
}

export function usePatchSection(surveyId: number) {
  const invalidate = useInvalidateBuilder(surveyId);
  return useAuthorizedMutation("surveys:update", {
    mutationKey: ["surveys", "sections", "patch", surveyId] as const,
    mutationFn: ({ sectionId, input }: { sectionId: number; input: PatchSectionInput }) =>
      apiClient.patch<SurveyBuilderSection>(`/surveys/${surveyId}/sections/${sectionId}`, input, undefined, surveySectionRowC),
    onSuccess: invalidate,
  });
}

export function useDeleteSection(surveyId: number) {
  const invalidate = useInvalidateBuilder(surveyId);
  return useAuthorizedMutation("surveys:update", {
    mutationKey: ["surveys", "sections", "delete", surveyId] as const,
    mutationFn: (sectionId: number) => apiClient.delete<{ success: boolean }>(`/surveys/${surveyId}/sections/${sectionId}`, undefined, undefined, builderSuccessC),
    onSuccess: invalidate,
  });
}

export function useCreateQuestion(surveyId: number) {
  const invalidate = useInvalidateBuilder(surveyId);
  return useAuthorizedMutation("surveys:update", {
    mutationKey: ["surveys", "questions", "create", surveyId] as const,
    mutationFn: (input: CreateQuestionInput) => apiClient.post<SurveyBuilderQuestion>(`/surveys/${surveyId}/questions`, input, undefined, surveyQuestionRowC),
    onSuccess: invalidate,
  });
}

export function usePatchQuestion(surveyId: number) {
  const invalidate = useInvalidateBuilder(surveyId);
  return useAuthorizedMutation("surveys:update", {
    mutationKey: ["surveys", "questions", "patch", surveyId] as const,
    mutationFn: ({ questionId, input }: { questionId: number; input: PatchQuestionInput }) =>
      apiClient.patch<SurveyBuilderQuestion>(`/surveys/${surveyId}/questions/${questionId}`, input, undefined, surveyQuestionRowC),
    onSuccess: invalidate,
  });
}

export function useDeleteQuestion(surveyId: number) {
  const invalidate = useInvalidateBuilder(surveyId);
  return useAuthorizedMutation("surveys:update", {
    mutationKey: ["surveys", "questions", "delete", surveyId] as const,
    mutationFn: (questionId: number) => apiClient.delete<{ success: boolean }>(`/surveys/${surveyId}/questions/${questionId}`, undefined, undefined, builderSuccessC),
    onSuccess: invalidate,
  });
}

export function useDuplicateQuestion(surveyId: number) {
  const invalidate = useInvalidateBuilder(surveyId);
  return useAuthorizedMutation("surveys:update", {
    mutationKey: ["surveys", "questions", "duplicate", surveyId] as const,
    mutationFn: (questionId: number) =>
      apiClient.post<SurveyBuilderQuestion>(`/surveys/${surveyId}/questions/${questionId}/duplicate`, undefined, undefined, surveyQuestionRowC),
    onSuccess: invalidate,
  });
}

export function useReorderBuilder(surveyId: number) {
  const invalidate = useInvalidateBuilder(surveyId);
  return useAuthorizedMutation("surveys:update", {
    mutationKey: ["surveys", "reorder", surveyId] as const,
    mutationFn: (input: ReorderInput) => apiClient.patch<{ success: boolean }>(`/surveys/${surveyId}/reorder`, input, undefined, builderSuccessC),
    onSuccess: invalidate,
  });
}
