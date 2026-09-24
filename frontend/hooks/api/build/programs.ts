"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";

const programPageContract = lazyContract(() =>
  import("@/hooks/api/build/portfolios-schema").then((m) => m.programPageContract),
);
const programRowContract = lazyContract(() =>
  import("@/hooks/api/build/portfolios-schema").then((m) => m.programRowContract),
);
const noContentContract = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);
import { useCan } from "@/hooks/api/access";
import type {
  CreateProgramInput,
  Program,
  ProgramsPage,
  PortfolioHealth,
  PortfolioStatus,
  UpdateProgramInput,
} from "@/types/projects";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export type ProgramListSort = "createdAt" | "updatedAt" | "name";
export type ProgramListOrder = "asc" | "desc";

export interface ProgramListFilters {
  cursor?: string;
  limit?: number;
  q?: string;
  ownerId?: string;
  health?: PortfolioHealth;
  status?: PortfolioStatus;
  portfolioId?: number;
  projectId?: number;
  sort?: ProgramListSort;
  order?: ProgramListOrder;
}

export function usePrograms(filters?: ProgramListFilters) {
  const canView = useCan("build:programs:view");
  const params: Record<string, string> = {};
  if (filters?.cursor) params["cursor"] = filters.cursor;
  if (filters?.limit) params["limit"] = String(filters.limit);
  if (filters?.q) params["q"] = filters.q;
  if (filters?.ownerId) params["ownerId"] = filters.ownerId;
  if (filters?.health) params["health"] = filters.health;
  if (filters?.status) params["status"] = filters.status;
  if (filters?.portfolioId) params["portfolioId"] = String(filters.portfolioId);
  if (filters?.projectId) params["projectId"] = String(filters.projectId);
  if (filters?.sort) params["sort"] = filters.sort;
  if (filters?.order) params["order"] = filters.order;
  return useQuery<ProgramsPage>({
    queryKey: buildWorkQueryKeys.projects.programs.list(
      Object.keys(params).length > 0 ? params : undefined,
    ),
    queryFn: ({ signal }) =>
      apiClient.get<ProgramsPage>("/build/programs", params, signal, programPageContract),
    enabled: canView,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
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
    mutationFn: ({ programId, ...data }: UpdateProgramInput & { programId: number }) =>
      apiClient.patch<Program>(`/build/programs/${programId}`, data, undefined, programRowContract),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.programs.list() });
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.programs.detail(vars.programId),
      });
    },
  });
}

export function useDeleteProgram() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:programs:manage", {
    mutationKey: ["projects", "programs", "delete"],
    mutationFn: (programId: number) =>
      apiClient.delete<void>(`/build/programs/${programId}`, undefined, undefined, noContentContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.programs.list() });
    },
  });
}
