"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useGatedQuery } from "@/hooks/api/gated-query";
import type { z } from "zod";
import type { programDetailContract as ProgramDetailContract } from "./portfolios-schema";

const programPageContract = lazyContract(() =>
  import("@/hooks/api/build/portfolios-schema").then((m) => m.programPageContract),
);
const programRowContract = lazyContract(() =>
  import("@/hooks/api/build/portfolios-schema").then((m) => m.programRowContract),
);
const programDetailContract = lazyContract(() =>
  import("@/hooks/api/build/portfolios-schema").then((m) => m.programDetailContract),
);
const noContentContract = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);
import { useCan } from "@/hooks/api/access";
import type {
  CreateProgramInput,
  Program,
  ProgramsPage,
  UpdateProgramInput,
} from "@/types/projects";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import {
  programsListQueryOptions,
  buildProgramsParams,
  type ProgramListFilters,
} from "./programs-read-options";

export function useProgram(
  programId: number,
  filters?: { projectsCursor?: string; projectsLimit?: number },
) {
  const params: Record<string, string> = {};
  if (filters?.projectsCursor) params["projectsCursor"] = filters.projectsCursor;
  if (filters?.projectsLimit) params["projectsLimit"] = String(filters.projectsLimit);
  const hasParams = Object.keys(params).length > 0;
  return useGatedQuery<z.infer<typeof ProgramDetailContract>>("build:programs:view", {
    queryKey: buildWorkQueryKeys.projects.programs.detail(programId, hasParams ? params : undefined),
    queryFn: ({ signal }) => apiClient.get<z.infer<typeof ProgramDetailContract>>(
      `/build/programs/${programId}`, hasParams ? params : undefined, signal, programDetailContract,
    ),
    enabled: Number.isInteger(programId) && programId > 0,
    staleTime: 60_000,
    throwOnError: false,
  });
}

export function useCreateProgram() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:programs:manage", {
    mutationKey: ["projects", "programs", "create"],
    mutationFn: (data: CreateProgramInput) =>
      apiClient.post<Program>("/build/programs", data, undefined, programRowContract),
    onSuccess: (newProgram) => {
      qc.setQueriesData<ProgramsPage>(
        { queryKey: buildWorkQueryKeys.projects.programs.list() },
        (prev) => {
          if (!prev) return prev;
          return { ...prev, data: [newProgram, ...prev.data] };
        },
      );
    },
  });
}

export function useUpdateProgram() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:programs:manage", {
    mutationKey: ["projects", "programs", "update"],
    mutationFn: ({ programId, ...data }: UpdateProgramInput & { programId: number }) =>
      apiClient.patch<Program>(`/build/programs/${programId}`, data, undefined, programRowContract),
    onSuccess: (updated, vars) => {
      qc.setQueriesData<ProgramsPage>(
        { queryKey: buildWorkQueryKeys.projects.programs.list() },
        (prev) =>
          prev
            ? {
                ...prev,
                data: prev.data.map((p) => (p.id === vars.programId ? updated : p)),
              }
            : prev,
      );
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
    onSuccess: (_, programId) => {
      qc.setQueriesData<ProgramsPage>(
        { queryKey: buildWorkQueryKeys.projects.programs.list() },
        (old) => old ? { ...old, data: old.data.filter((p) => p.id !== programId) } : old,
      );
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.programs.detail(programId),
        refetchType: "none",
      });
    },
  });
}

export function usePrograms(filters?: ProgramListFilters) {
  const canView = useCan("build:programs:view");
  const params = buildProgramsParams(filters);
  return useQuery<ProgramsPage>({
    ...programsListQueryOptions(filters),
    queryFn: ({ signal }) =>
      apiClient.get<ProgramsPage>("/build/programs", params, signal, programPageContract),
    enabled: canView,
    placeholderData: keepPreviousData,
  });
}
