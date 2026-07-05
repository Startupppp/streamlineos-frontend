"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { AutomationCondition, AutomationAction, ProjectAutomation } from "@/types/projects";
export type { AutomationCondition, AutomationAction, ProjectAutomation } from "@/types/projects";

export const TRIGGER_EVENTS = [
  { value: "ticket.created", label: "Ticket Created" },
  { value: "ticket.updated", label: "Ticket Updated" },
  { value: "ticket.status_changed", label: "Status Changed" },
  { value: "ticket.assigned", label: "Ticket Assigned" },
  { value: "sprint.started", label: "Sprint Started" },
  { value: "sprint.completed", label: "Sprint Completed" },
] as const;

export const CONDITION_OPERATORS = [
  { value: "equals", label: "equals" },
  { value: "not_equals", label: "doesn't equal" },
  { value: "contains", label: "contains" },
  { value: "is_empty", label: "is empty" },
  { value: "is_not_empty", label: "is not empty" },
] as const;

export const ACTION_TYPES = [
  { value: "set_status", label: "Set Status" },
  { value: "set_assignee", label: "Assign To" },
  { value: "set_priority", label: "Set Priority" },
  { value: "add_label", label: "Add Label" },
  { value: "add_comment", label: "Add Comment" },
] as const;

function automationKeys(projectId: number) {
  return ["projects", projectId, "automations"] as const;
}

export function useAutomations(projectId: number) {
  return useQuery<ProjectAutomation[]>({
    queryKey: automationKeys(projectId),
    queryFn: () => apiClient.get<ProjectAutomation[]>(`/projects/${projectId}/automations`),
    enabled: !!projectId,
    staleTime: 60_000,
  });
}

export function useCreateAutomation(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", projectId, "automations", "create"],
    mutationFn: (data: Omit<ProjectAutomation, "id" | "projectId" | "createdAt">) =>
      apiClient.post<ProjectAutomation>(`/projects/${projectId}/automations`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: automationKeys(projectId) }),
  });
}

export function useUpdateAutomation(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", projectId, "automations", "update"],
    mutationFn: ({ id, ...data }: Partial<ProjectAutomation> & { id: number }) =>
      apiClient.patch<ProjectAutomation>(`/projects/${projectId}/automations/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: automationKeys(projectId) }),
  });
}

export function useDeleteAutomation(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", projectId, "automations", "delete"],
    mutationFn: (id: number) => apiClient.delete(`/projects/${projectId}/automations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: automationKeys(projectId) }),
  });
}
