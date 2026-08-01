"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export type LogicConditionOp =
  | "answer_equals"
  | "answer_contains"
  | "score_gt"
  | "score_lt"
  | "metadata_equals"
  | "collector_equals"
  | "contact_field_equals"
  | "completion_status_equals";

export type LogicActionType =
  | "skip_to_question"
  | "skip_to_section"
  | "show_question"
  | "hide_question"
  | "disqualify"
  | "end_survey"
  | "assign_score"
  | "assign_segment"
  | "create_lead"
  | "send_notification"
  | "set_variable";

export interface LogicCondition {
  op: LogicConditionOp;
  questionId?: number;
  value?: unknown;
}

export interface LogicAction {
  type: LogicActionType;
}

export interface CreateLogicRuleInput {
  sourceQuestionId: number;
  condition: LogicCondition;
  action: LogicAction;
  target?: Record<string, unknown> | null;
  sortOrder?: number;
}

export type PatchLogicRuleInput = Partial<CreateLogicRuleInput>;

function useInvalidateBuilder(surveyId: number) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: queryKeys.surveys.builder(surveyId) });
}

export function useCreateLogicRule(surveyId: number) {
  const invalidate = useInvalidateBuilder(surveyId);
  return useMutation({
    mutationKey: ["surveys", "logic", "create", surveyId] as const,
    mutationFn: (input: CreateLogicRuleInput) => apiClient.post(`/surveys/${surveyId}/logic`, input),
    onSuccess: invalidate,
  });
}

export function useDeleteLogicRule(surveyId: number) {
  const invalidate = useInvalidateBuilder(surveyId);
  return useMutation({
    mutationKey: ["surveys", "logic", "delete", surveyId] as const,
    mutationFn: (ruleId: number) => apiClient.delete(`/surveys/${surveyId}/logic/${ruleId}`),
    onSuccess: invalidate,
  });
}
