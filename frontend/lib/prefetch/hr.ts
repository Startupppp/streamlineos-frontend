import "server-only";

import { QueryClient, dehydrate } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { serverGet } from "@/lib/server-fetch";
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
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: queryKeys.hr.documents({ limit: 20 }),
    queryFn: () => serverGet<HrDocumentListResponse>("/hr/documents?limit=20"),
    staleTime: 60_000,
  });
  return dehydrate(queryClient);
}

export async function prefetchHrAssets() {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: queryKeys.hr.assets({ page: 1, limit: 20 }),
    queryFn: () => serverGet<HrAssetListResponse>("/hr/assets?page=1&limit=20"),
    staleTime: 60_000,
  });
  return dehydrate(queryClient);
}
