"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";

export type AutomationEventType =
  | "survey.published"
  | "survey.response.started"
  | "survey.response.submitted"
  | "survey.assessment.passed"
  | "survey.assessment.failed"
  | "survey.live.started"
  | "survey.live.ended"
  | "survey.lead.created"
  | "survey.collector.completed_quota";

export type AutomationActionType = "create_lead" | "update_lead" | "webhook" | "notify_owner";

export interface AutomationAction {
  type: AutomationActionType;
  scoreThreshold?: number;
  config?: Record<string, unknown>;
}

export interface AutomationRule {
  id: string;
  eventType: AutomationEventType;
  action: AutomationAction;
}

export interface CreateAutomationInput {
  eventType: AutomationEventType;
  action: AutomationAction;
}

export function useSurveyAutomations(surveyId: number) {
  return useGatedQuery("surveys:automations:manage", {
    queryKey: knowledgeAndSurveysQueryKeys.surveys.automations(surveyId),
    queryFn: ({ signal }) => apiClient.get<AutomationRule[]>(`/surveys/${surveyId}/automations`, undefined, signal),
    staleTime: 30_000,
  });
}

function useInvalidateAutomations(surveyId: number) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.surveys.automations(surveyId) });
}

export function useCreateAutomation(surveyId: number) {
  const invalidate = useInvalidateAutomations(surveyId);
  return useAuthorizedMutation("surveys:automations:manage", {
    mutationKey: ["surveys", "automations", "create", surveyId] as const,
    mutationFn: (input: CreateAutomationInput) => apiClient.post<AutomationRule>(`/surveys/${surveyId}/automations`, input),
    onSuccess: invalidate,
  });
}

export function useDeleteAutomation(surveyId: number) {
  const invalidate = useInvalidateAutomations(surveyId);
  return useAuthorizedMutation("surveys:automations:manage", {
    mutationKey: ["surveys", "automations", "delete", surveyId] as const,
    mutationFn: (automationId: string) => apiClient.delete(`/surveys/${surveyId}/automations/${automationId}`),
    onSuccess: invalidate,
  });
}
