"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface Release {
  id: number;
  projectId: number;
  name: string;
  version: string;
  description: string | null;
  status: "draft" | "released" | "archived";
  releaseDate: string | null;
  ticketCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReleaseInput {
  name: string;
  version: string;
  description?: string | null;
  status?: "draft" | "released" | "archived";
  releaseDate?: string | null;
}

export interface UpdateReleaseInput {
  releaseId: number;
  name?: string;
  version?: string;
  description?: string | null;
  status?: "draft" | "released" | "archived";
  releaseDate?: string | null;
}

function releaseKey(projectId: number) {
  return ["streamlineos", "projects", projectId, "releases"] as const;
}

export function useReleases(projectId: number) {
  return useQuery<Release[]>({
    queryKey: releaseKey(projectId),
    queryFn: () => apiClient.get<Release[]>(`/projects/${projectId}/releases`),
    enabled: !!projectId,
    staleTime: 60_000,
  });
}

export function useCreateRelease(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", projectId, "releases", "create"],
    mutationFn: (data: CreateReleaseInput) =>
      apiClient.post<Release>(`/projects/${projectId}/releases`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: releaseKey(projectId) }),
  });
}

export function useUpdateRelease(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", projectId, "releases", "update"],
    mutationFn: ({ releaseId, ...data }: UpdateReleaseInput) =>
      apiClient.patch<Release>(`/projects/${projectId}/releases/${releaseId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: releaseKey(projectId) }),
  });
}

export function useDeleteRelease(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", projectId, "releases", "delete"],
    mutationFn: (releaseId: number) =>
      apiClient.delete(`/projects/${projectId}/releases/${releaseId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: releaseKey(projectId) }),
  });
}
