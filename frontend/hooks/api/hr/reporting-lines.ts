"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import type { ManagerCoverageReport, ReportingLineView } from "@/hooks/api/hr/reporting-lines-schema";

const reportingLineViewLazy = lazyContract(() =>
  import("@/hooks/api/hr/reporting-lines-schema").then((m) => m.reportingLineViewContract),
);
const managerCoverageLazy = lazyContract(() =>
  import("@/hooks/api/hr/reporting-lines-schema").then((m) => m.managerCoverageReportContract),
);

export function useReportingLine(employeeUserId: string) {
  const canView = useCan("hr:employees:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.reportingLine(employeeUserId),
    queryFn: ({ signal }) =>
      apiClient.get<ReportingLineView>(`/hr/reporting-lines/${employeeUserId}`, undefined, signal, reportingLineViewLazy),
    enabled: hrEnabled && canView && employeeUserId !== "",
    staleTime: 60_000,
    ...INLINE_READ_ERROR,
  });
}

export function useManagerCoverage() {
  const canView = useCan("hr:employees:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.managerCoverage(),
    queryFn: ({ signal }) =>
      apiClient.get<ManagerCoverageReport>("/hr/reporting-lines/coverage", undefined, signal, managerCoverageLazy),
    enabled: hrEnabled && canView,
    staleTime: 60_000,
    ...INLINE_READ_ERROR,
  });
}
