import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";

export interface EpicListFilters {
  q?: string;
  status?: string;
  ownerId?: string;
  health?: "on_track" | "at_risk" | "off_track";
  cursor?: string;
  limit?: number;
}

export function buildEpicsParams(filters?: EpicListFilters): Record<string, string> {
  const queryParams: Record<string, string> = {};
  for (const [key, value] of Object.entries(filters ?? {}))
    if (value !== undefined && value !== "") queryParams[key] = String(value);
  return queryParams;
}

export function epicPageQueryOptions(projectId: number, filters?: EpicListFilters) {
  return {
    queryKey: [...buildWorkQueryKeys.projects.epics(projectId), filters ?? {}],
    staleTime: 30_000,
  };
}
