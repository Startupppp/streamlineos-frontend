"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { buildWorkQueryKeys as queryKeys } from "@/lib/query-keys/build-work";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useCan } from "@/hooks/api/access";
import type { ProjectAutomation, AutomationActionType } from "@/types/projects";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

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

export const TRIGGER_EVENTS = [
  { value: "ticket.created", label: "Ticket Created" },
  { value: "ticket.updated", label: "Ticket Updated" },
  { value: "ticket.status_changed", label: "Status Changed" },
  { value: "ticket.assigned", label: "Ticket Assigned" },
  { value: "sprint.started", label: "Sprint Started" },
  { value: "sprint.completed", label: "Sprint Completed" },
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
}

export function useAutomations(
  projectId: number,
  filters?: AutomationsFilters,
) {
  const canView = useCan("build:view");
  const params = new URLSearchParams();
  if (filters?.action) params.set("action", filters.action);
  if (filters?.ownerId) params.set("ownerId", filters.ownerId);
  const queryString = params.toString();
  const url = queryString
    ? `/build/${projectId}/automations?${queryString}`
    : `/build/${projectId}/automations`;
  return useQuery<ProjectAutomation[]>({
    queryKey: [...queryKeys.projects.automations(projectId), filters ?? {}],
    queryFn: ({ signal }) =>
      apiClient.get<ProjectAutomation[]>(
        url,
        undefined,
        signal,
        projectAutomationListContract,
      ),
    enabled: canView && !!projectId,
    staleTime: 60_000,
  });
}

export function useCreateAutomation(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:manage", {
    mutationKey: ["projects", projectId, "automations", "create"],
    mutationFn: (
      data: Omit<ProjectAutomation, "id" | "projectId" | "createdAt">,
    ) =>
      apiClient.post<ProjectAutomation>(
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
    }: Partial<ProjectAutomation> & { automationId: number }) =>
      apiClient.patch<ProjectAutomation>(
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
