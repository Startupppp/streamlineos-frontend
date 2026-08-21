import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan, useModuleEnabled } from "@/hooks/api/access";

export interface CompOffRecord {
  orgId: string;
  userId: string;
  earnedDays: string;
}

export function useCompOff() {
  const canView = useCan("hr:attendance:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery<CompOffRecord[]>({
    queryKey: queryKeys.hr.compOff(),
    queryFn: () => apiClient.get<CompOffRecord[]>("/hr/overtime/comp-off"),
    staleTime: 60_000,
    enabled: hrEnabled && canView,
  });
}
