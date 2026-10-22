import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { compOffQueryOptions } from "@/hooks/api/hr/comp-off-read-options";

const compOffBalanceListLazy = lazyContract(() =>
  import("@/hooks/api/hr/comp-off-schema").then((m) => m.compOffBalanceListContract),
);

export interface CompOffRecord {
  orgId: string;
  userId: string;
  earnedDays: string;
  usedDays: string;
}

export function useCompOff() {
  const canView = useCan("hr:attendance:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery<CompOffRecord[]>({
    ...compOffQueryOptions(),
    queryFn: ({ signal }) => apiClient.get<CompOffRecord[]>("/hr/overtime/comp-off", undefined, signal, compOffBalanceListLazy),
    enabled: hrEnabled && canView,
  });
}
