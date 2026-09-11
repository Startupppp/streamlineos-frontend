"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

const assetListPageC = lazyContract(() =>
  import("@/hooks/api/hr/assets-schema").then((m) => m.assetListPageContract),
);
import { useCan } from "@/hooks/api/access";
import type { Asset } from "@/types/hr";

export interface HrAssetListParams {
  cursor?: string;
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
  pagination: { limit: number; hasMore: boolean; nextCursor: string | null };
}

export const hrAssetListPrefix = [...humanResourcesQueryKeys.hr.all, "assets"] as const;

export function useHrAssetList(params?: HrAssetListParams) {
  const canAssets = useCan("hr:assets:view");
  const queryParams: Record<string, unknown> = {
    limit: params?.limit ?? 20,
    ...(params?.cursor ? { cursor: params.cursor } : {}),
    ...(params?.status ? { status: params.status } : {}),
  };
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.assets(queryParams),
    queryFn: ({ signal }) => apiClient.get<HrAssetListResponse>("/hr/assets", queryParams, signal, assetListPageC),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
    enabled: canAssets,
  });
}

const EXPORT_PAGE_LIMIT = 100;
const EXPORT_MAX_ROWS = 5_000;

export async function fetchAllAssetsForExport(
  params: Omit<HrAssetListParams, "cursor" | "limit">,
): Promise<Asset[]> {
  const all: Asset[] = [];
  let cursor: string | undefined;

  while (all.length < EXPORT_MAX_ROWS) {
    const res = await apiClient.get<HrAssetListResponse>("/hr/assets", {
      ...(params.status ? { status: params.status } : {}),
      ...(cursor ? { cursor } : {}),
      limit: EXPORT_PAGE_LIMIT,
    }, undefined, assetListPageC);
    all.push(...res.data);
    if (!res.pagination.hasMore || !res.pagination.nextCursor) break;
    cursor = res.pagination.nextCursor;
  }

  return all.slice(0, EXPORT_MAX_ROWS);
}
