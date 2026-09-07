"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";

const programListContract = lazyContract(() =>
  import("@/hooks/api/build/portfolios-schema").then((m) => m.programListContract),
);
const programRowContract = lazyContract(() =>
  import("@/hooks/api/build/portfolios-schema").then((m) => m.programRowContract),
);
import { useCan } from "@/hooks/api/access";
import type {
  Program,
  CreateProgramInput,
  UpdateProgramInput,
} from "@/types/projects";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

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
    queryKey: buildWorkQueryKeys.projects.programs.list(
      Object.keys(params).length > 0 ? params : undefined,
    ),
    queryFn: ({ signal }) => apiClient.get<Program[]>("/build/programs", params, signal, programListContract),
    enabled: canView,
    staleTime: 60_000,
  });
}

export function useCreateProgram() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:programs:manage", {
    mutationKey: ["projects", "programs", "create"],
    mutationFn: (data: CreateProgramInput) =>
      apiClient.post<Program>("/build/programs", data, undefined, programRowContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.programs.list() });
    },
  });
}

export function useUpdateProgram() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:programs:manage", {
    mutationKey: ["projects", "programs", "update"],
    mutationFn: ({ id, ...data }: UpdateProgramInput & { id: number }) =>
      apiClient.patch<Program>(`/build/programs/${id}`, data, undefined, programRowContract),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.programs.list() });
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.programs.detail(vars.id),
      });
    },
  });
}

export function useDeleteProgram() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:programs:manage", {
    mutationKey: ["projects", "programs", "delete"],
    mutationFn: (id: number) => apiClient.delete<void>(`/build/programs/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.programs.list() });
    },
  });
}
