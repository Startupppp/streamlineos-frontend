"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { SurveyQuestionType } from "@/features/surveys/shared/question-type-meta";

export interface SurveyBuilderChoice {
  id: number;
  choiceKey: string;
  label: string;
  value: string | null;
  score: number | null;
  sortOrder: number;
  isCorrect: boolean;
}

export interface SurveyBuilderQuestion {
  id: number;
  questionKey: string;
  variableName: string | null;
  type: SurveyQuestionType;
  title: string;
  description: string | null;
  required: boolean;
  settings: Record<string, unknown>;
  validation: Record<string, unknown>;
  scoring: Record<string, unknown>;
  sortOrder: number;
  choices: SurveyBuilderChoice[];
}

export interface SurveyBuilderSection {
  id: number;
  title: string;
  description: string | null;
  sortOrder: number;
  settings: Record<string, unknown>;
  questions: SurveyBuilderQuestion[];
}

export interface SurveyBuilderLogicRule {
  id: number;
  sourceQuestionId: number;
  condition: Record<string, unknown>;
  action: Record<string, unknown>;
  target: Record<string, unknown> | null;
  sortOrder: number;
}

export interface SurveyBuilderData {
  sections: SurveyBuilderSection[];
  logicRules: SurveyBuilderLogicRule[];
}

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
  return () => qc.invalidateQueries({ queryKey: queryKeys.surveys.builder(surveyId) });
}

export function useSurveyBuilder(surveyId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.surveys.builder(surveyId ?? -1),
    queryFn: ({ signal }) => apiClient.get<SurveyBuilderData>(`/surveys/${surveyId}/builder`, undefined, signal),
    enabled: typeof surveyId === "number",
    staleTime: 10_000,
  });
}

export function useCreateSection(surveyId: number) {
  const invalidate = useInvalidateBuilder(surveyId);
  return useMutation({
    mutationKey: ["surveys", "sections", "create", surveyId] as const,
    mutationFn: (input: CreateSectionInput) => apiClient.post<SurveyBuilderSection>(`/surveys/${surveyId}/sections`, input),
    onSuccess: invalidate,
  });
}

export function usePatchSection(surveyId: number) {
  const invalidate = useInvalidateBuilder(surveyId);
  return useMutation({
    mutationKey: ["surveys", "sections", "patch", surveyId] as const,
    mutationFn: ({ sectionId, input }: { sectionId: number; input: PatchSectionInput }) =>
      apiClient.patch<SurveyBuilderSection>(`/surveys/${surveyId}/sections/${sectionId}`, input),
    onSuccess: invalidate,
  });
}

export function useDeleteSection(surveyId: number) {
  const invalidate = useInvalidateBuilder(surveyId);
  return useMutation({
    mutationKey: ["surveys", "sections", "delete", surveyId] as const,
    mutationFn: (sectionId: number) => apiClient.delete<{ success: boolean }>(`/surveys/${surveyId}/sections/${sectionId}`),
    onSuccess: invalidate,
  });
}

export function useCreateQuestion(surveyId: number) {
  const invalidate = useInvalidateBuilder(surveyId);
  return useMutation({
    mutationKey: ["surveys", "questions", "create", surveyId] as const,
    mutationFn: (input: CreateQuestionInput) => apiClient.post<SurveyBuilderQuestion>(`/surveys/${surveyId}/questions`, input),
    onSuccess: invalidate,
  });
}

export function usePatchQuestion(surveyId: number) {
  const invalidate = useInvalidateBuilder(surveyId);
  return useMutation({
    mutationKey: ["surveys", "questions", "patch", surveyId] as const,
    mutationFn: ({ questionId, input }: { questionId: number; input: PatchQuestionInput }) =>
      apiClient.patch<SurveyBuilderQuestion>(`/surveys/${surveyId}/questions/${questionId}`, input),
    onSuccess: invalidate,
  });
}

export function useDeleteQuestion(surveyId: number) {
  const invalidate = useInvalidateBuilder(surveyId);
  return useMutation({
    mutationKey: ["surveys", "questions", "delete", surveyId] as const,
    mutationFn: (questionId: number) => apiClient.delete<{ success: boolean }>(`/surveys/${surveyId}/questions/${questionId}`),
    onSuccess: invalidate,
  });
}

export function useDuplicateQuestion(surveyId: number) {
  const invalidate = useInvalidateBuilder(surveyId);
  return useMutation({
    mutationKey: ["surveys", "questions", "duplicate", surveyId] as const,
    mutationFn: (questionId: number) =>
      apiClient.post<SurveyBuilderQuestion>(`/surveys/${surveyId}/questions/${questionId}/duplicate`),
    onSuccess: invalidate,
  });
}

export function useReorderBuilder(surveyId: number) {
  const invalidate = useInvalidateBuilder(surveyId);
  return useMutation({
    mutationKey: ["surveys", "reorder", surveyId] as const,
    mutationFn: (input: ReorderInput) => apiClient.patch<{ success: boolean }>(`/surveys/${surveyId}/reorder`, input),
    onSuccess: invalidate,
  });
}
