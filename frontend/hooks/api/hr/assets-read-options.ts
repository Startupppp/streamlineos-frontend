import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import type { HrAssetListParams } from "@/hooks/api/hr/assets";

export const hrAssetListPrefix = [...humanResourcesQueryKeys.hr.all, "assets"] as const;

export function hrAssetListQueryOptions(params?: HrAssetListParams) {
  const queryParams: Record<string, unknown> = {
    limit: params?.limit ?? 20,
    ...(params?.cursor ? { cursor: params.cursor } : {}),
    ...(params?.status ? { status: params.status } : {}),
  };
  return {
    queryKey: humanResourcesQueryKeys.hr.assets(queryParams),
    staleTime: 60_000,
  } as const;
}
