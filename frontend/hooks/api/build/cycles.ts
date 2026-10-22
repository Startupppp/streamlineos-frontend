"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { Cycle, CreateCycleInput } from "@/types/projects";
import {
  cyclesQueryOptions,
  buildCyclesParams,
  type CycleListFilters,
} from "./cycles-read-options";

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

export type CyclePage = {
  data: Cycle[];
  pagination: { limit: number; hasMore: boolean; nextCursor: string | null };
};


export function useCyclePage(
  projectId: number,
  filters?: CycleListFilters,
  options?: Omit<UseQueryOptions<CyclePage>, "queryKey" | "queryFn" | "enabled">
) {
  const canView = useCan("build:cycles:view");
  const queryParams = buildCyclesParams(filters);
  return useQuery<CyclePage>({
    ...cyclesQueryOptions(projectId, filters),
    queryFn: ({ signal }) =>
      apiClient.get<CyclePage>(
        `/build/${projectId}/cycles`,
        Object.keys(queryParams).length > 0 ? queryParams : undefined,
        signal,
        cycleListContract,
      ),
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
  const queryParams = buildCyclesParams(filters);
  return useQuery<CyclePage, Error, Cycle[]>({
    ...cyclesQueryOptions(projectId, filters),
    queryFn: ({ signal }) =>
      apiClient.get<CyclePage>(
        `/build/${projectId}/cycles`,
        Object.keys(queryParams).length > 0 ? queryParams : undefined,
        signal,
        cycleListContract,
      ),
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
