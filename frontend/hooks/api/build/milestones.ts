"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { ProjectMilestone, ProjectBudget } from "@/types/projects";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { queryKeyBase } from "@/lib/query-keys/base";
export type { ProjectMilestone, ProjectBudget } from "@/types/projects";

interface CreateMilestoneInput {
  name: string;
  description?: string;
  targetDate: string;
  status?: "PENDING" | "ACHIEVED" | "MISSED";
}

interface UpdateMilestoneInput {
  name?: string;
  description?: string;
  targetDate?: string;
  status?: "PENDING" | "ACHIEVED" | "MISSED";
}

function milestoneKey(projectId: number) {
  return [...queryKeyBase, "projects", projectId, "milestones"] as const;
}

export function useProjectMilestones(projectId: number) {
  const canView = useCan("build:view");
  return useQuery({
    queryKey: milestoneKey(projectId),
    queryFn: ({ signal }) => apiClient.get<ProjectMilestone[]>(`/build/${projectId}/milestones`, undefined, signal),
    enabled: canView && !!projectId,
    staleTime: 30_000,
  });
}

export function useCreateMilestone(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:workspace:manage", {
    mutationKey: ["projects", "milestones", "create"],
    mutationFn: (input: CreateMilestoneInput) =>
      apiClient.post<ProjectMilestone>(`/build/${projectId}/milestones`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: milestoneKey(projectId) }),
  });
}

export function useUpdateMilestone(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:workspace:manage", {
    mutationKey: ["projects", "milestones", "update"],
    mutationFn: ({ id, ...input }: UpdateMilestoneInput & { id: number }) =>
      apiClient.patch<ProjectMilestone>(`/build/${projectId}/milestones/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: milestoneKey(projectId) }),
  });
}

export function useDeleteMilestone(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:workspace:manage", {
    mutationKey: ["projects", "milestones", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/build/${projectId}/milestones/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: milestoneKey(projectId) }),
  });
}

export function useProjectBudget(projectId: number) {
  const canManage = useCan("build:manage");
  return useQuery({
    queryKey: queryKeys.projects.budget(projectId),
    queryFn: ({ signal }) => apiClient.get<ProjectBudget>(`/build/${projectId}/budget`, undefined, signal),
    enabled: canManage && !!projectId,
    staleTime: 60_000,
  });
}

export function useUpdateProjectBudget(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:manage", {
    mutationKey: ["projects", "budget", "update"],
    mutationFn: (budget: number) =>
      apiClient.patch<{ id: number; budget: string }>(`/build/${projectId}/budget`, { budget }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.projects.budget(projectId) }),
  });
}
