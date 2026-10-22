import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import type { ReportingManagerRequestStatus } from "@/hooks/api/hr/reporting-manager-requests-schema";

export function reportingManagerRequestsQueryOptions(params: {
  status: ReportingManagerRequestStatus | null;
  cursor: string | null;
  limit: number | null;
}) {
  return {
    queryKey: humanResourcesQueryKeys.hr.reportingManagerRequests(params),
    staleTime: 30_000,
  } as const;
}
