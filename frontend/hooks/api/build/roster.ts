"use client";

import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useCan } from "@/hooks/api/access";

const projectRosterContract = lazyContract(() =>
  import("@/hooks/api/build/build-project-schema").then((m) => m.projectRosterContract),
);

export interface RosterTeam {
  id: number;
  name: string;
  key: string;
}

export interface RosterMember {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
  image: string | null;
}

export interface ProjectRoster {
  teams: RosterTeam[];
  members: RosterMember[];
}

export function useProjectRoster(
  projectId: number,
  options?: Omit<UseQueryOptions<ProjectRoster, Error>, "queryKey" | "queryFn">,
) {
  const canView = useCan("build:view");
  const { enabled: callerEnabled, ...restOptions } = options ?? {};
  const enabled = canView && !!projectId && (callerEnabled ?? true);

  return useQuery<ProjectRoster, Error>({
    queryKey: buildWorkQueryKeys.projects.roster.detail(projectId),
    queryFn: ({ signal }) => apiClient.get<ProjectRoster>(`/build/${projectId}/roster`, undefined, signal, projectRosterContract),
    staleTime: 30_000,
    enabled,
    ...restOptions,
  });
}
