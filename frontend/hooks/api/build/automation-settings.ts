"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { buildWorkQueryKeys as queryKeys } from "@/lib/query-keys/build-work";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type {
  ProjectsAutomationsGetAiPolicyResponse,
  ProjectsAutomationsGetToolPermissionsResponse,
  ProjectsAutomationsGetTokenQuotaResponse,
  ProjectsAutomationsGetHumanConfirmationResponse,
  ProjectsAutomationsPutAiPolicyBody,
  ProjectsAutomationsPutToolPermissionsBody,
  ProjectsAutomationsPutHumanConfirmationBody,
} from "@/contracts/build-contracts.generated";

const aiPolicyContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then((m) => m.projectsAutomationsGetAiPolicyResponseSchema),
);
const toolPermissionsContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then((m) => m.projectsAutomationsGetToolPermissionsResponseSchema),
);
const tokenQuotaContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then((m) => m.projectsAutomationsGetTokenQuotaResponseSchema),
);
const humanConfirmationContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then((m) => m.projectsAutomationsGetHumanConfirmationResponseSchema),
);

export type AutomationAiPolicyInput = ProjectsAutomationsPutAiPolicyBody;
export type AutomationToolPermissionsInput = ProjectsAutomationsPutToolPermissionsBody;
export type AutomationHumanConfirmationInput = ProjectsAutomationsPutHumanConfirmationBody;

export function useAutomationAiPolicy(projectId: number, automationId: number) {
  const canView = useCan("build:view");
  return useQuery({
    queryKey: queryKeys.projects.automationSettings(projectId, automationId, "ai-policy"),
    queryFn: ({ signal }) =>
      apiClient.get<ProjectsAutomationsGetAiPolicyResponse>(`/build/${projectId}/automations/${automationId}/ai-policy`, undefined, signal, aiPolicyContract),
    enabled: canView && projectId > 0 && automationId > 0,
    staleTime: 60_000,
  });
}

export function useUpdateAutomationAiPolicy(projectId: number, automationId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:manage", {
    mutationKey: queryKeys.projects.automationSettings(projectId, automationId, "ai-policy"),
    mutationFn: (body: AutomationAiPolicyInput) =>
      apiClient.put<ProjectsAutomationsGetAiPolicyResponse>(`/build/${projectId}/automations/${automationId}/ai-policy`, body, undefined, aiPolicyContract),
    onSuccess: (data) => qc.setQueryData(queryKeys.projects.automationSettings(projectId, automationId, "ai-policy"), data),
  });
}

export function useAutomationToolPermissions(projectId: number, automationId: number) {
  const canView = useCan("build:view");
  return useQuery({
    queryKey: queryKeys.projects.automationSettings(projectId, automationId, "tool-permissions"),
    queryFn: ({ signal }) =>
      apiClient.get<ProjectsAutomationsGetToolPermissionsResponse>(`/build/${projectId}/automations/${automationId}/tool-permissions`, undefined, signal, toolPermissionsContract),
    enabled: canView && projectId > 0 && automationId > 0,
    staleTime: 60_000,
  });
}

export function useUpdateAutomationToolPermissions(projectId: number, automationId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:manage", {
    mutationKey: queryKeys.projects.automationSettings(projectId, automationId, "tool-permissions"),
    mutationFn: (body: AutomationToolPermissionsInput) =>
      apiClient.put<ProjectsAutomationsGetToolPermissionsResponse>(`/build/${projectId}/automations/${automationId}/tool-permissions`, body, undefined, toolPermissionsContract),
    onSuccess: (data) => qc.setQueryData(queryKeys.projects.automationSettings(projectId, automationId, "tool-permissions"), data),
  });
}

export function useAutomationTokenQuota(projectId: number, automationId: number) {
  const canView = useCan("build:view");
  return useQuery({
    queryKey: queryKeys.projects.automationSettings(projectId, automationId, "token-quota"),
    queryFn: ({ signal }) =>
      apiClient.get<ProjectsAutomationsGetTokenQuotaResponse>(`/build/${projectId}/automations/${automationId}/token-quota`, undefined, signal, tokenQuotaContract),
    enabled: canView && projectId > 0 && automationId > 0,
    staleTime: 30_000,
  });
}

export function useAutomationHumanConfirmation(projectId: number, automationId: number) {
  const canView = useCan("build:view");
  return useQuery({
    queryKey: queryKeys.projects.automationSettings(projectId, automationId, "human-confirmation"),
    queryFn: ({ signal }) =>
      apiClient.get<ProjectsAutomationsGetHumanConfirmationResponse>(`/build/${projectId}/automations/${automationId}/human-confirmation`, undefined, signal, humanConfirmationContract),
    enabled: canView && projectId > 0 && automationId > 0,
    staleTime: 60_000,
  });
}

export function useUpdateAutomationHumanConfirmation(projectId: number, automationId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:manage", {
    mutationKey: queryKeys.projects.automationSettings(projectId, automationId, "human-confirmation"),
    mutationFn: (body: AutomationHumanConfirmationInput) =>
      apiClient.put<ProjectsAutomationsGetHumanConfirmationResponse>(`/build/${projectId}/automations/${automationId}/human-confirmation`, body, undefined, humanConfirmationContract),
    onSuccess: (data) => qc.setQueryData(queryKeys.projects.automationSettings(projectId, automationId, "human-confirmation"), data),
  });
}
