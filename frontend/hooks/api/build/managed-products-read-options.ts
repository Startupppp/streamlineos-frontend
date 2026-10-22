import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";

export interface ListManagedProductsParams {
  limit?: number;
  cursor?: string;
  status?: string;
  search?: string;
  ownerId?: string;
  sort?: "name" | "updated" | "status";
  lifecycle?: string;
  health?: string;
  teamId?: string;
  segment?: string;
  tag?: string;
  linkedProjectId?: string;
  archived?: boolean;
}

export function buildManagedProductsParams(params?: ListManagedProductsParams): Record<string, string> {
  const queryParams: Record<string, string> = {};
  if (params?.cursor) queryParams["cursor"] = params.cursor;
  if (params?.status) queryParams["status"] = params.status;
  if (params?.search) queryParams["search"] = params.search;
  if (params?.limit) queryParams["limit"] = String(params.limit);
  if (params?.ownerId) queryParams["ownerId"] = params.ownerId;
  if (params?.sort) queryParams["sort"] = params.sort;
  if (params?.lifecycle) queryParams["lifecycle"] = params.lifecycle;
  if (params?.health) queryParams["health"] = params.health;
  if (params?.teamId) queryParams["teamId"] = params.teamId;
  if (params?.segment) queryParams["segment"] = params.segment;
  if (params?.tag) queryParams["tag"] = params.tag;
  if (params?.linkedProjectId) queryParams["linkedProjectId"] = params.linkedProjectId;
  if (params?.archived !== undefined) queryParams["archived"] = String(params.archived);
  return queryParams;
}

export function managedProductsListQueryOptions(params?: ListManagedProductsParams) {
  const queryParams = buildManagedProductsParams(params);
  return {
    queryKey: buildWorkQueryKeys.projects.managedProducts.list(
      Object.keys(queryParams).length > 0 ? queryParams : undefined,
    ),
    staleTime: 60_000,
  };
}
