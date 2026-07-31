"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type {
  Program,
  ProgramDetail,
  CreateProgramInput,
  UpdateProgramInput,
} from "@/types/projects";

interface ListFilters {
  status?: string;
  portfolioId?: number;
}

export function usePrograms(filters?: ListFilters) {
  const canView = useCan("build:programs:view");
  const params: Record<string, string> = {};
  if (filters?.status) params["status"] = filters.status;
  if (filters?.portfolioId) params["portfolioId"] = String(filters.portfolioId);
  return useQuery<Program[]>({
    queryKey: queryKeys.projects.programs.list(
      Object.keys(params).length > 0 ? params : undefined,
    ),
    queryFn: () => apiClient.get<Program[]>("/build/programs", params),
    enabled: canView,
    staleTime: 60_000,
  });
}

export function useProgram(id: number) {
  const canView = useCan("build:programs:view");
  return useQuery<ProgramDetail>({
    queryKey: queryKeys.projects.programs.detail(id),
    queryFn: () => apiClient.get<ProgramDetail>(`/build/programs/${id}`),
    enabled: canView && !!id,
    staleTime: 60_000,
  });
}

export function useCreateProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "programs", "create"],
    mutationFn: (data: CreateProgramInput) =>
      apiClient.post<Program>("/build/programs", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.programs.list() });
    },
  });
}

export function useUpdateProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "programs", "update"],
    mutationFn: ({ id, ...data }: UpdateProgramInput & { id: number }) =>
      apiClient.patch<Program>(`/build/programs/${id}`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.programs.list() });
      qc.invalidateQueries({
        queryKey: queryKeys.projects.programs.detail(vars.id),
      });
    },
  });
}

export function useDeleteProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "programs", "delete"],
    mutationFn: (id: number) => apiClient.delete<void>(`/build/programs/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.programs.list() });
    },
  });
}

export function useLinkProgramProject(programId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "programs", programId, "link"],
    mutationFn: (projectId: number) =>
      apiClient.post<{ success: boolean }>(
        `/build/programs/${programId}/projects`,
        { projectId },
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.projects.programs.detail(programId),
      });
    },
  });
}

export function useUnlinkProgramProject(programId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "programs", programId, "unlink"],
    mutationFn: (projectId: number) =>
      apiClient.delete<void>(
        `/build/programs/${programId}/projects/${projectId}`,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.projects.programs.detail(programId),
      });
    },
  });
}
