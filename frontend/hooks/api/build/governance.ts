"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  Risk, Decision,
  CreateRiskInput, UpdateRiskInput,
  CreateDecisionInput, UpdateDecisionInput,
} from "@/types/projects";

interface ListFilters {
  status?: string;
}

export function useProjectRisks(projectId: number, filters?: ListFilters) {
  const params: Record<string, string> = {};
  if (filters?.status) params["status"] = filters.status;

  return useQuery<Risk[]>({
    queryKey: queryKeys.projects.risks.list(
      projectId,
      Object.keys(params).length > 0 ? params : undefined,
    ),
    queryFn: () => apiClient.get<Risk[]>(`/build/${projectId}/risks`, params),
    enabled: !!projectId,
    staleTime: 60_000,
  });
}

export function useCreateRisk(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", projectId, "risks", "create"],
    mutationFn: (data: CreateRiskInput) =>
      apiClient.post<Risk>(`/build/${projectId}/risks`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.risks.list(projectId) });
    },
  });
}

export function useUpdateRisk(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", projectId, "risks", "update"],
    mutationFn: ({ id, ...data }: UpdateRiskInput & { id: number }) =>
      apiClient.patch<Risk>(`/build/${projectId}/risks/${id}`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.risks.list(projectId) });
      qc.invalidateQueries({ queryKey: queryKeys.projects.risks.detail(projectId, vars.id) });
    },
  });
}

export function useDeleteRisk(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", projectId, "risks", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/build/${projectId}/risks/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.risks.list(projectId) });
    },
  });
}

export function useProjectDecisions(projectId: number, filters?: ListFilters) {
  const params: Record<string, string> = {};
  if (filters?.status) params["status"] = filters.status;

  return useQuery<Decision[]>({
    queryKey: queryKeys.projects.decisions.list(
      projectId,
      Object.keys(params).length > 0 ? params : undefined,
    ),
    queryFn: () => apiClient.get<Decision[]>(`/build/${projectId}/decisions`, params),
    enabled: !!projectId,
    staleTime: 60_000,
  });
}

export function useCreateDecision(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", projectId, "decisions", "create"],
    mutationFn: (data: CreateDecisionInput) =>
      apiClient.post<Decision>(`/build/${projectId}/decisions`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.decisions.list(projectId) });
    },
  });
}

export function useUpdateDecision(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", projectId, "decisions", "update"],
    mutationFn: ({ id, ...data }: UpdateDecisionInput & { id: number }) =>
      apiClient.patch<Decision>(`/build/${projectId}/decisions/${id}`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.decisions.list(projectId) });
      qc.invalidateQueries({ queryKey: queryKeys.projects.decisions.detail(projectId, vars.id) });
    },
  });
}

export function useDeleteDecision(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", projectId, "decisions", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/build/${projectId}/decisions/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.decisions.list(projectId) });
    },
  });
}
