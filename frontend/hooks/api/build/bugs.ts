"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useCan } from "@/hooks/api/access";
import type { Bug } from "@/types/projects";

const bugListContract = lazyContract(() =>
  import("@/hooks/api/build/qa-schema").then((m) => m.bugListContract),
);
const bugRowContract = lazyContract(() =>
  import("@/hooks/api/build/qa-schema").then((m) => m.bugRowContract),
);

type BugFilters = {
  status?: string;
  severity?: string;
  assigneeId?: string;
  q?: string;
};

export function useBugs(projectId?: number, filters?: BugFilters) {
  const canView = useCan("build:bugs:view");
  const params: Record<string, string> = {};
  if (filters?.status) params["status"] = filters.status;
  if (filters?.severity) params["severity"] = filters.severity;
  if (filters?.assigneeId) params["assigneeId"] = filters.assigneeId;
  if (filters?.q) params["q"] = filters.q;

  return useQuery<Bug[]>({
    queryKey: buildWorkQueryKeys.projects.bugs.list(projectId ?? 0, filters),
    queryFn: ({ signal }) => apiClient.get<Bug[]>(`/build/${projectId}/bugs`, params, signal, bugListContract),
    enabled: canView && !!projectId,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useBug(
  projectId?: number,
  bugId?: number,
  options?: { enabled?: boolean },
) {
  const canView = useCan("build:bugs:view");

  return useQuery<Bug>({
    queryKey: buildWorkQueryKeys.projects.bugs.detail(
      projectId ?? 0,
      bugId ?? 0,
    ),
    queryFn: ({ signal }) =>
      apiClient.get<Bug>(
        `/build/${projectId}/bugs/${bugId}`,
        undefined,
        signal,
        bugRowContract,
      ),
    enabled: canView && !!projectId && !!bugId && (options?.enabled ?? true),
    staleTime: 60_000,
  });
}
