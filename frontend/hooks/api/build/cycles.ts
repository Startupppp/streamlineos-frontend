"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { Cycle, CreateCycleInput } from "@/types/projects";

const cycleListContract = lazyContract(() =>
  import("@/hooks/api/build/execution-schema").then((m) => m.cycleListContract),
);
const cycleRowContract = lazyContract(() =>
  import("@/hooks/api/build/execution-schema").then((m) => m.cycleRowContract),
);
const cycleUpdateRowContract = lazyContract(() =>
  import("@/hooks/api/build/execution-schema").then((m) => m.cycleUpdateRowContract),
);
const noContentLazy = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);

export interface CycleListFilters {
  status?: "draft" | "active" | "completed";
  q?: string;
  from?: string;
  to?: string;
  cursor?: string;
  limit?: number;
}

export type CyclePage = {
  data: Cycle[];
  pagination: { limit: number; hasMore: boolean; nextCursor: string | null };
};

function cyclePageQuery(projectId: number, filters?: CycleListFilters) {
  const activeFilters = filters ?? {};
  const queryParams: Record<string, string> = {};
  for (const [key, value] of Object.entries(activeFilters))
    if (value !== undefined && value !== "") queryParams[key] = String(value);
  return {
    queryKey: [...buildWorkQueryKeys.projects.cycles(projectId), activeFilters],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      apiClient.get<CyclePage>(
        `/build/${projectId}/cycles`,
        Object.keys(queryParams).length > 0 ? queryParams : undefined,
        signal,
        cycleListContract,
      ),
    staleTime: 60_000,
  };
}

export function useCyclePage(
  projectId: number,
  filters?: CycleListFilters,
  options?: Omit<UseQueryOptions<CyclePage>, "queryKey" | "queryFn" | "enabled">
) {
  const canView = useCan("build:cycles:view");
  return useQuery<CyclePage>({
    ...cyclePageQuery(projectId, filters),
    ...options,
    enabled: canView && !!projectId,
  });
}

export function useCycles(
  projectId: number,
  filters?: CycleListFilters,
  options?: Omit<
    UseQueryOptions<CyclePage, Error, Cycle[]>,
    "queryKey" | "queryFn" | "enabled" | "select"
  >
) {
  const canView = useCan("build:cycles:view");
  return useQuery<CyclePage, Error, Cycle[]>({
    ...cyclePageQuery(projectId, filters),
    select: (page) => page.data,
    ...options,
    enabled: canView && !!projectId,
  });
}

export function useCreateCycle(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("build:cycles:manage", {
    ...options,
    mutationKey: ["projects", "cycles", "create"],
    mutationFn: ({ projectId, ...data }: CreateCycleInput) =>
      apiClient.post<Cycle>(`/build/${projectId}/cycles`, data, undefined, cycleRowContract),
    onSuccess: (_: unknown, variables: CreateCycleInput) => {
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.cycles(variables.projectId),
      });
    },
  });
}

interface UpdateCycleInput {
  projectId: number;
  cycleId: number;
  version: number;
  name?: string;
  description?: string;
  goal?: string;
  capacity?: number | null;
  status?: "draft" | "active" | "completed";
  startDate?: string;
  endDate?: string;
}

export function useUpdateCycle(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("build:cycles:manage", {
    ...options,
    mutationKey: ["projects", "cycles", "update"],
    mutationFn: ({ projectId, cycleId, ...data }: UpdateCycleInput) =>
      apiClient.patch<Cycle>(`/build/${projectId}/cycles/${cycleId}`, data, undefined, cycleUpdateRowContract),
    onSuccess: (cycle: Cycle, variables: UpdateCycleInput) => {
      const queryKey = buildWorkQueryKeys.projects.cycles(variables.projectId);
      queryClient.setQueriesData<CyclePage>({ queryKey }, (current) =>
        current
          ? { ...current, data: current.data.map((item) => item.id === cycle.id ? { ...item, ...cycle } : item) }
          : current,
      );
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projectReports.velocity(variables.projectId),
      });
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projectReports.burnup(variables.projectId),
      });
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projectReports.cycleTime(variables.projectId),
      });
    },
  });
}

export function useDeleteCycle(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("build:cycles:manage", {
    ...options,
    mutationKey: ["projects", "cycles", "delete"],
    mutationFn: ({ projectId, cycleId }: { projectId: number; cycleId: number }) =>
      apiClient.delete<void>(`/build/${projectId}/cycles/${cycleId}`, undefined, undefined, noContentLazy),
    onSuccess: (_: unknown, variables: { projectId: number; cycleId: number }) => {
      const queryKey = buildWorkQueryKeys.projects.cycles(variables.projectId);
      queryClient.setQueriesData<CyclePage>({ queryKey }, (current) =>
        current
          ? { ...current, data: current.data.filter((cycle) => cycle.id !== variables.cycleId) }
          : current,
      );
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projectReports.velocity(variables.projectId),
      });
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projectReports.burnup(variables.projectId),
      });
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projectReports.cycleTime(variables.projectId),
      });
    },
  });
}
