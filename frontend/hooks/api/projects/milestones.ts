"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { ProjectMilestone, ProjectBudget } from "@/types/projects";
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
  return ["streamlineos", "projects", projectId, "milestones"] as const;
}

export function useProjectMilestones(projectId: number) {
  return useQuery({
    queryKey: milestoneKey(projectId),
    queryFn: () => apiClient.get<ProjectMilestone[]>(`/projects/${projectId}/milestones`),
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

export function useCreateMilestone(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "milestones", "create"],
    mutationFn: (input: CreateMilestoneInput) =>
      apiClient.post<ProjectMilestone>(`/projects/${projectId}/milestones`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: milestoneKey(projectId) }),
  });
}

export function useUpdateMilestone(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "milestones", "update"],
    mutationFn: ({ id, ...input }: UpdateMilestoneInput & { id: number }) =>
      apiClient.patch<ProjectMilestone>(`/projects/${projectId}/milestones/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: milestoneKey(projectId) }),
  });
}

export function useDeleteMilestone(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "milestones", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/projects/${projectId}/milestones/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: milestoneKey(projectId) }),
  });
}

export function useProjectBudget(projectId: number) {
  return useQuery({
    queryKey: queryKeys.projects.budget(projectId),
    queryFn: () => apiClient.get<ProjectBudget>(`/projects/${projectId}/budget`),
    enabled: !!projectId,
    staleTime: 60_000,
  });
}

export function useUpdateProjectBudget(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "budget", "update"],
    mutationFn: (budget: number) =>
      apiClient.patch<{ id: number; budget: string }>(`/projects/${projectId}/budget`, { budget }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.projects.budget(projectId) }),
  });
}
