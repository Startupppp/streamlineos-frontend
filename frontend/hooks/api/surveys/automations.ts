"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

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
  return useQuery({
    queryKey: queryKeys.surveys.automations(surveyId),
    queryFn: () => apiClient.get<AutomationRule[]>(`/surveys/${surveyId}/automations`),
    staleTime: 30_000,
  });
}

function useInvalidateAutomations(surveyId: number) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: queryKeys.surveys.automations(surveyId) });
}

export function useCreateAutomation(surveyId: number) {
  const invalidate = useInvalidateAutomations(surveyId);
  return useMutation({
    mutationKey: ["surveys", "automations", "create", surveyId] as const,
    mutationFn: (input: CreateAutomationInput) => apiClient.post<AutomationRule>(`/surveys/${surveyId}/automations`, input),
    onSuccess: invalidate,
  });
}

export function useDeleteAutomation(surveyId: number) {
  const invalidate = useInvalidateAutomations(surveyId);
  return useMutation({
    mutationKey: ["surveys", "automations", "delete", surveyId] as const,
    mutationFn: (automationId: string) => apiClient.delete(`/surveys/${surveyId}/automations/${automationId}`),
    onSuccess: invalidate,
  });
}
