"use client";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { buildWorkQueryKeys as queryKeys } from "@/lib/query-keys/build-work";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useCan } from "@/hooks/api/access";
import type { ProjectAutomation, AutomationActionType } from "@/types/projects";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type {
  ProjectsAutomationsGetAiPolicyResponse,
  ProjectsAutomationsGetToolPermissionsResponse,
  ProjectsAutomationsGetTokenQuotaResponse,
  ProjectsAutomationsGetHumanConfirmationResponse,
  ProjectsAutomationsPutAiPolicyBody,
  ProjectsAutomationsPutToolPermissionsBody,
  ProjectsAutomationsPutHumanConfirmationBody,
  ProjectsAutomationsDryRunResponse,
  ProjectsAutomationsReplayRunResponse,
} from "@/contracts/build-contracts.generated";
import { NO_CURSOR_YET } from "@/hooks/api/cursor-page-param";
import type {
  DryRunTicketInput,
  AutomationRunRow,
} from "@/hooks/api/build/automation-analysis-schema";

const projectAutomationListContract = lazyContract(() =>
  import("@/hooks/api/build/build-project-schema").then(
    (m) => m.projectAutomationListContract,
  ),
);
const projectAutomationRowContract = lazyContract(() =>
  import("@/hooks/api/build/build-project-schema").then(
    (m) => m.projectAutomationRowContract,
  ),
);
const noContentContract = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);

type AutomationWriteInput = Pick<
  ProjectAutomation,
  "name" | "isActive" | "triggerEvent" | "conditions" | "actions"
>;

export const TRIGGER_EVENTS = [
  { value: "ticket.created", label: "Ticket Created" },
  { value: "ticket.updated", label: "Ticket Updated" },
  { value: "ticket.status_changed", label: "Status Changed" },
  { value: "ticket.assigned", label: "Ticket Assigned" },
] as const;

export const ACTION_TYPES = [
  { value: "set_status", label: "Set Status" },
  { value: "set_assignee", label: "Assign To" },
  { value: "set_priority", label: "Set Priority" },
  { value: "add_label", label: "Add Label" },
  { value: "add_comment", label: "Add Comment" },
  { value: "request_approval", label: "Request Approval" },
] as const;

export interface AutomationsFilters {
  action?: AutomationActionType;
  ownerId?: string;
  search?: string;
}

export function useAutomations(
  projectId: number,
  filters?: AutomationsFilters,
) {
  const canView = useCan("build:view");
  const baseParams: Record<string, string> = {};
  if (filters?.action) baseParams["action"] = filters.action;
  if (filters?.ownerId) baseParams["ownerId"] = filters.ownerId;
  if (filters?.search) baseParams["search"] = filters.search;
  return useInfiniteQuery({
    queryKey: [...queryKeys.projects.automations(projectId), filters ?? {}],
    queryFn: ({ signal, pageParam }) => {
      const params = pageParam !== undefined
        ? { ...baseParams, cursor: pageParam }
        : baseParams;
      return apiClient.get<{
        data: ProjectAutomation[];
        pagination: {
          limit: number;
          hasMore: boolean;
          nextCursor: string | null;
        };
      }>(
        `/build/${projectId}/automations`,
        params,
        signal,
        projectAutomationListContract,
      );
    },
    initialPageParam: NO_CURSOR_YET,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
    enabled: canView && !!projectId,
    staleTime: 60_000,
  });
}

export function useCreateAutomation(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:manage", {
    mutationKey: ["projects", projectId, "automations", "create"],
    mutationFn: (data: AutomationWriteInput) =>
      apiClient.post(
        `/build/${projectId}/automations`,
        data,
        undefined,
        projectAutomationRowContract,
      ),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: queryKeys.projects.automations(projectId),
      }),
  });
}

export function useUpdateAutomation(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:manage", {
    mutationKey: ["projects", projectId, "automations", "update"],
    mutationFn: ({
      automationId,
      ...data
    }: Partial<AutomationWriteInput> & { automationId: number }) =>
      apiClient.patch(
        `/build/${projectId}/automations/${automationId}`,
        data,
        undefined,
        projectAutomationRowContract,
      ),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: queryKeys.projects.automations(projectId),
      }),
  });
}

const automationDryRunContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then(
    (m) => m.projectsAutomationsDryRunResponseSchema,
  ),
);

const automationReplayContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then(
    (m) => m.projectsAutomationsReplayRunResponseSchema,
  ),
);

const automationRunListContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then(
    (m) => m.projectsAutomationsListRunsResponseSchema,
  ),
);


export function useAutomationRuns(projectId: number, automationId?: number) {
  const canView = useCan("build:view");
  const baseParams: Record<string, string> = {};
  if (automationId !== undefined) baseParams["automationId"] = String(automationId);
  return useInfiniteQuery({
    queryKey: [...queryKeys.projects.automations(projectId), "runs", automationId ?? null],
    queryFn: ({ signal, pageParam }) => {
      const params = pageParam !== undefined ? { ...baseParams, cursor: pageParam } : baseParams;
      return apiClient.get<{ items: AutomationRunRow[]; pagination: { limit: number; hasMore: boolean; nextCursor: string | null } }>(
        `/build/${projectId}/automations/runs`,
        params,
        signal,
        automationRunListContract,
      );
    },
    initialPageParam: NO_CURSOR_YET,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
    enabled: canView && !!projectId,
    staleTime: 30_000,
  });
}

export function useAutomationDryRun(projectId: number) {
  return useAuthorizedMutation("build:view", {
    mutationKey: ["projects", projectId, "automations", "dry-run"],
    mutationFn: (data: { triggerEvent: string; ticket: DryRunTicketInput }) =>
      apiClient.post<ProjectsAutomationsDryRunResponse>(
        `/build/${projectId}/automations/dry-run`,
        data,
        undefined,
        automationDryRunContract,
      ),
  });
}

export function useReplayAutomationRun(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:manage", {
    mutationKey: ["projects", projectId, "automations", "replay"],
    mutationFn: (runId: number) =>
      apiClient.post<ProjectsAutomationsReplayRunResponse>(
        `/build/${projectId}/automations/runs/${runId}/replay`,
        undefined,
        undefined,
        automationReplayContract,
      ),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: queryKeys.projects.automations(projectId),
      }),
  });
}

export function useDeleteAutomation(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:manage", {
    mutationKey: ["projects", projectId, "automations", "delete"],
    mutationFn: (automationId: number) =>
      apiClient.delete<void>(
        `/build/${projectId}/automations/${automationId}`,
        undefined,
        undefined,
        noContentContract,
      ),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: queryKeys.projects.automations(projectId),
      }),
  });
}

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
