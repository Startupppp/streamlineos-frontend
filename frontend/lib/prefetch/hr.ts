import "server-only";

import { dehydrate } from "@tanstack/react-query";
import { createServerQueryClient } from "./server-query-client";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { serverGet } from "@/lib/server-fetch";
import { hrDocumentListContract, hrAssetListContract } from "@/lib/prefetch/prefetch-schema";
import type { Document, Asset } from "@/types/hr";

interface HrDocumentListResponse {
  data: Document[];
  pageInfo: { limit: number; hasMore: boolean; nextCursor: string | null };
}

interface HrAssetCounts {
  total: number;
  available: number;
  assigned: number;
  maintenance: number;
  retired: number;
}

interface HrAssetListResponse {
  data: Asset[];
  counts: HrAssetCounts;
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export async function prefetchHrDocuments() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    queryKey: humanResourcesQueryKeys.hr.documents({ limit: 20 }),
    queryFn: () => serverGet<HrDocumentListResponse>("/hr/documents?limit=20", hrDocumentListContract),
    staleTime: 60_000,
  });
  return dehydrate(queryClient);
}

export async function prefetchHrAssets() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    queryKey: humanResourcesQueryKeys.hr.assets({ page: 1, limit: 20 }),
    queryFn: () => serverGet<HrAssetListResponse>("/hr/assets?page=1&limit=20", hrAssetListContract),
    staleTime: 60_000,
  });
  return dehydrate(queryClient);
}
