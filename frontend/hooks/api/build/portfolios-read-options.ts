import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";

export interface ListFilters {
  cursor?: string;
  limit?: number;
  search?: string;
  status?: string;
  ownerId?: string;
  health?: string;
  sort?: string;
}

export function buildPortfoliosParams(filters?: ListFilters): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters?.cursor) params["cursor"] = filters.cursor;
  if (filters?.limit) params["limit"] = String(filters.limit);
  if (filters?.search) params["q"] = filters.search;
  if (filters?.status) params["status"] = filters.status;
  if (filters?.ownerId) params["ownerId"] = filters.ownerId;
  if (filters?.health) params["health"] = filters.health;
  if (filters?.sort) params["sort"] = filters.sort;
  return params;
}

export function portfoliosListQueryOptions(filters?: ListFilters) {
  const params = buildPortfoliosParams(filters);
  return {
    queryKey: buildWorkQueryKeys.projects.portfolios.list(
      Object.keys(params).length > 0 ? params : undefined,
    ),
    staleTime: 30_000,
  };
}
