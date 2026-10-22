import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import type { PortfolioHealth, PortfolioStatus } from "@/types/projects";

export type ProgramListSort = "createdAt" | "updatedAt" | "name";
export type ProgramListOrder = "asc" | "desc";

export interface ProgramListFilters {
  cursor?: string;
  limit?: number;
  q?: string;
  ownerId?: string;
  health?: PortfolioHealth;
  status?: PortfolioStatus;
  portfolioId?: number;
  projectId?: number;
  sort?: ProgramListSort;
  order?: ProgramListOrder;
}

export function buildProgramsParams(filters?: ProgramListFilters): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters?.cursor) params["cursor"] = filters.cursor;
  if (filters?.limit) params["limit"] = String(filters.limit);
  if (filters?.q) params["q"] = filters.q;
  if (filters?.ownerId) params["ownerId"] = filters.ownerId;
  if (filters?.health) params["health"] = filters.health;
  if (filters?.status) params["status"] = filters.status;
  if (filters?.portfolioId) params["portfolioId"] = String(filters.portfolioId);
  if (filters?.projectId) params["projectId"] = String(filters.projectId);
  if (filters?.sort) params["sort"] = filters.sort;
  if (filters?.order) params["order"] = filters.order;
  return params;
}

export function programsListQueryOptions(filters?: ProgramListFilters) {
  const params = buildProgramsParams(filters);
  return {
    queryKey: buildWorkQueryKeys.projects.programs.list(
      Object.keys(params).length > 0 ? params : undefined,
    ),
    staleTime: 30_000,
  };
}
