import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";

export interface CycleListFilters {
  status?: "draft" | "active" | "completed";
  q?: string;
  from?: string;
  to?: string;
  cursor?: string;
  limit?: number;
}

export function buildCyclesParams(filters?: CycleListFilters): Record<string, string> {
  const activeFilters = filters ?? {};
  const queryParams: Record<string, string> = {};
  for (const [key, value] of Object.entries(activeFilters))
    if (value !== undefined && value !== "") queryParams[key] = String(value);
  return queryParams;
}

export function cyclesQueryOptions(projectId: number, filters?: CycleListFilters) {
  const activeFilters = filters ?? {};
  return {
    queryKey: [...buildWorkQueryKeys.projects.cycles(projectId), activeFilters],
    staleTime: 60_000,
  };
}
