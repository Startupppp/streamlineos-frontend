"use client";

import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useCan } from "@/hooks/api/access";

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

const ROSTER_BASE = ["projects", "roster"] as const;

export const rosterQueryKeys = {
  detail: (projectId: number) => [...ROSTER_BASE, projectId] as const,
};

export function useProjectRoster(
  projectId: number,
  options?: Omit<UseQueryOptions<ProjectRoster, Error>, "queryKey" | "queryFn">,
) {
  const canView = useCan("projects:view");
  const { enabled: callerEnabled, ...restOptions } = options ?? {};
  const enabled = canView && !!projectId && (callerEnabled ?? true);

  return useQuery<ProjectRoster, Error>({
    queryKey: rosterQueryKeys.detail(projectId),
    queryFn: () => apiClient.get<ProjectRoster>(`/projects/${projectId}/roster`),
    staleTime: 30_000,
    enabled,
    ...restOptions,
  });
}
