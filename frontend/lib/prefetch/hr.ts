import "server-only";

import type { z } from "zod";

import { dehydrate } from "@tanstack/react-query";
import { createServerQueryClient } from "./server-query-client";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { serverGet } from "@/lib/server-fetch";
import { hrDocumentListContract } from "@/lib/prefetch/prefetch-schema";
import { assetListPageContract } from "@/hooks/api/hr/assets-schema";

type HrDocumentListResponse = z.infer<typeof hrDocumentListContract>;

type HrAssetListResponse = z.infer<typeof assetListPageContract>;

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
    queryKey: humanResourcesQueryKeys.hr.assets({ limit: 20 }),
    queryFn: () => serverGet<HrAssetListResponse>("/hr/assets?limit=20", assetListPageContract),
    staleTime: 60_000,
  });
  return dehydrate(queryClient);
}
