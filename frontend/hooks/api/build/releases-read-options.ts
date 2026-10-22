import { queryKeyBase } from "@/lib/query-keys/base";

export interface ReleaseListQuery {
  cursor?: string;
  limit?: number;
  status?: "draft" | "released" | "archived";
  q?: string;
  from?: string;
  to?: string;
}

export function releaseBaseKey(projectId: number) {
  return [...queryKeyBase, "projects", projectId, "releases"] as const;
}

function releaseKey(projectId: number, query?: ReleaseListQuery) {
  return [...releaseBaseKey(projectId), query ?? {}] as const;
}

export function releasesListQueryOptions(projectId: number, query?: ReleaseListQuery) {
  return {
    queryKey: releaseKey(projectId, query ?? {}),
    staleTime: 60_000,
  };
}
