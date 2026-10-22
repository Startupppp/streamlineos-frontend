"use client";

import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import type { EpicPage, EpicItem } from "@/hooks/api/build/execution-schema";
import {
  epicPageQueryOptions,
  buildEpicsParams,
  type EpicListFilters,
} from "./epics-read-options";

export type { EpicPage, EpicItem };

const epicPageContract = lazyContract(() =>
  import("@/hooks/api/build/execution-schema").then((m) => m.epicPageContract),
);

export function useEpicPage(
  projectId: number,
  filters?: EpicListFilters,
  options?: Omit<UseQueryOptions<EpicPage>, "queryKey" | "queryFn" | "enabled">,
) {
  const canView = useCan("build:tickets:view");
  const queryParams = buildEpicsParams(filters);
  return useQuery<EpicPage>({
    ...epicPageQueryOptions(projectId, filters),
    queryFn: ({ signal }) =>
      apiClient.get<EpicPage>(
        `/build/${projectId}/epics`,
        Object.keys(queryParams).length > 0 ? queryParams : undefined,
        signal,
        epicPageContract,
      ),
    ...options,
    enabled: canView && !!projectId,
  });
}

export function useEpics(
  projectId: number,
  options?: Omit<
    UseQueryOptions<EpicPage, Error, EpicItem[]>,
    "queryKey" | "queryFn" | "enabled" | "select"
  >,
) {
  const canView = useCan("build:tickets:view");
  const queryParams = buildEpicsParams();
  return useQuery<EpicPage, Error, EpicItem[]>({
    ...epicPageQueryOptions(projectId),
    queryFn: ({ signal }) =>
      apiClient.get<EpicPage>(
        `/build/${projectId}/epics`,
        Object.keys(queryParams).length > 0 ? queryParams : undefined,
        signal,
        epicPageContract,
      ),
    select: (page) => page.data,
    ...options,
    enabled: canView && !!projectId,
  });
}
