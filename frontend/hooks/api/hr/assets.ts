"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan } from "@/hooks/api/access";
import type { Asset } from "@/types/hr";

export interface HrAssetListParams {
  page?: number;
  limit?: number;
  status?: string;
}

export interface HrAssetCounts {
  total: number;
  available: number;
  assigned: number;
  maintenance: number;
  retired: number;
}

export interface HrAssetListResponse {
  data: Asset[];
  counts: HrAssetCounts;
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export const hrAssetListPrefix = [...humanResourcesQueryKeys.hr.all, "assets"] as const;

export function useHrAssetList(params?: HrAssetListParams) {
  const canAssets = useCan("hr:assets:view");
  const queryParams: Record<string, unknown> = {
    page: params?.page ?? 1,
    limit: params?.limit ?? 20,
    ...(params?.status ? { status: params.status } : {}),
  };
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.assets(queryParams),
    queryFn: ({ signal }) => apiClient.get<HrAssetListResponse>("/hr/assets", queryParams, signal),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
    enabled: canAssets,
  });
}

const EXPORT_PAGE_LIMIT = 100;
const EXPORT_MAX_ROWS = 5_000;

export async function fetchAllAssetsForExport(
  params: Omit<HrAssetListParams, "page" | "limit">,
): Promise<Asset[]> {
  const all: Asset[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages && all.length < EXPORT_MAX_ROWS) {
    const res = await apiClient.get<HrAssetListResponse>("/hr/assets", {
      ...(params.status ? { status: params.status } : {}),
      page,
      limit: EXPORT_PAGE_LIMIT,
    });
    all.push(...res.data);
    totalPages = Math.max(1, res.pagination.totalPages);
    if (res.data.length === 0) break;
    page += 1;
  }

  return all.slice(0, EXPORT_MAX_ROWS);
}
