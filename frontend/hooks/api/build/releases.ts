"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import type { Release, CreateReleaseInput, UpdateReleaseInput } from "@/types/projects";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { queryKeyBase } from "@/lib/query-keys/base";
export type { Release } from "@/types/projects";

function releaseKey(projectId: number) {
  return [...queryKeyBase, "projects", projectId, "releases"] as const;
}

export function useReleases(projectId: number) {
  const canView = useCan("build:view");
  return useQuery<Release[]>({
    queryKey: releaseKey(projectId),
    queryFn: ({ signal }) => apiClient.get<Release[]>(`/build/${projectId}/releases`, undefined, signal),
    enabled: canView && !!projectId,
    staleTime: 60_000,
  });
}

export function useCreateRelease(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:manage", {
    mutationKey: ["projects", projectId, "releases", "create"],
    mutationFn: (data: CreateReleaseInput) =>
      apiClient.post<Release>(`/build/${projectId}/releases`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: releaseKey(projectId) }),
  });
}

export function useUpdateRelease(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:manage", {
    mutationKey: ["projects", projectId, "releases", "update"],
    mutationFn: ({ releaseId, ...data }: UpdateReleaseInput) =>
      apiClient.patch<Release>(`/build/${projectId}/releases/${releaseId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: releaseKey(projectId) }),
  });
}

export function useDeleteRelease(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:manage", {
    mutationKey: ["projects", projectId, "releases", "delete"],
    mutationFn: (releaseId: number) =>
      apiClient.delete(`/build/${projectId}/releases/${releaseId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: releaseKey(projectId) }),
  });
}
