"use client";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { buildWorkQueryKeys as queryKeys } from "@/lib/query-keys/build-work";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useCan } from "@/hooks/api/access";
import type { ProjectAutomation, AutomationActionType } from "@/types/projects";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { NO_CURSOR_YET } from "@/hooks/api/cursor-page-param";
import type {
  DryRunTicketInput,
  AutomationDryRunResult,
  AutomationReplayResult,
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
export type { ProjectAutomation, AutomationActionType } from "@/types/projects";

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
  import("@/hooks/api/build/automation-analysis-schema").then(
    (m) => m.automationDryRunResultContract,
  ),
);

const automationReplayContract = lazyContract(() =>
  import("@/hooks/api/build/automation-analysis-schema").then(
    (m) => m.automationReplayResultContract,
  ),
);

const automationRunListContract = lazyContract(() =>
  import("@/hooks/api/build/automation-analysis-schema").then(
    (m) => m.automationRunListContract,
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
      apiClient.post<AutomationDryRunResult>(
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
      apiClient.post<AutomationReplayResult>(
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
