"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useCan } from "@/hooks/api/access";
import type { ProjectAutomation } from "@/types/projects";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const projectAutomationListContract = lazyContract(() =>
  import("@/hooks/api/build/build-project-schema").then((m) => m.projectAutomationListContract),
);
const projectAutomationRowContract = lazyContract(() =>
  import("@/hooks/api/build/build-project-schema").then((m) => m.projectAutomationRowContract),
);
const noContentContract = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);
export type { ProjectAutomation } from "@/types/projects";

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

export function useAutomations(projectId: number) {
  const canView = useCan("build:view");
  return useQuery<ProjectAutomation[]>({
    queryKey: queryKeys.projects.automations(projectId),
    queryFn: ({ signal }) => apiClient.get<ProjectAutomation[]>(`/build/${projectId}/automations`, undefined, signal, projectAutomationListContract),
    enabled: canView && !!projectId,
    staleTime: 60_000,
  });
}

export function useCreateAutomation(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:manage", {
    mutationKey: ["projects", projectId, "automations", "create"],
    mutationFn: (data: Omit<ProjectAutomation, "id" | "projectId" | "createdAt">) =>
      apiClient.post<ProjectAutomation>(`/build/${projectId}/automations`, data, undefined, projectAutomationRowContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.projects.automations(projectId) }),
  });
}

export function useUpdateAutomation(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:manage", {
    mutationKey: ["projects", projectId, "automations", "update"],
    mutationFn: ({ id, ...data }: Partial<ProjectAutomation> & { id: number }) =>
      apiClient.patch<ProjectAutomation>(`/build/${projectId}/automations/${id}`, data, undefined, projectAutomationRowContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.projects.automations(projectId) }),
  });
}

export function useDeleteAutomation(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:manage", {
    mutationKey: ["projects", projectId, "automations", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<void>(`/build/${projectId}/automations/${id}`, undefined, undefined, noContentContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.projects.automations(projectId) }),
  });
}
