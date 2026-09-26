"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useIdempotentOperation } from "@/hooks/common/use-idempotent-operation";
import { invalidateHrWorkforceQueries } from "@/lib/hr-workforce-cache";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import type {
  ManagerCandidates,
  ManagerCoverageReport,
  ReportingLineView,
  SetReportingLineResponse,
} from "@/hooks/api/hr/reporting-lines-schema";

const reportingLineViewLazy = lazyContract(() =>
  import("@/hooks/api/hr/reporting-lines-schema").then((m) => m.reportingLineViewContract),
);
const setReportingLineLazy = lazyContract(() =>
  import("@/hooks/api/hr/reporting-lines-schema").then((m) => m.setReportingLineResponseContract),
);
const managerCoverageLazy = lazyContract(() =>
  import("@/hooks/api/hr/reporting-lines-schema").then((m) => m.managerCoverageReportContract),
);
const managerCandidatesLazy = lazyContract(() =>
  import("@/hooks/api/hr/reporting-lines-schema").then((m) => m.managerCandidatesContract),
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

/**
 * Active, accepted, eligible members only (CONTRACT §4.6), ≤ 20, server-searched.
 * The caller debounces `q`; `enabled` lets a picker fetch only while open.
 */
export function useManagerCandidates(q: string, excludeUserId?: string, options?: { enabled?: boolean }) {
  const canView = useCan("hr:employees:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.managerCandidates(q, excludeUserId),
    queryFn: ({ signal }) =>
      apiClient.get<ManagerCandidates>(
        "/hr/reporting-lines/manager-candidates",
        { ...(q ? { q } : {}), ...(excludeUserId ? { excludeUserId } : {}) },
        signal,
        managerCandidatesLazy,
      ),
    enabled: hrEnabled && canView && (options?.enabled ?? true),
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  });
}

export interface SetReportingLineInput {
  employeeUserId: string;
  primaryManagerUserId: string | null;
  topLevelReason?: string;
  secondaryManagers?: Array<{ managerUserId: string; label?: string }>;
  effectiveFrom?: string;
  reason?: string;
  emergency?: boolean;
}

export function useSetReportingLine() {
  const qc = useQueryClient();
  const operation = useIdempotentOperation();
  return useAuthorizedMutation("hr:reporting-lines:manage", {
    mutationKey: ["hr", "reportingLines", "set"],
    mutationFn: ({ employeeUserId, ...body }: SetReportingLineInput) =>
      apiClient.put<SetReportingLineResponse>(
        `/hr/reporting-lines/${employeeUserId}`,
        body,
        operation.configFor({ employeeUserId, ...body }),
        setReportingLineLazy,
      ),
    onSuccess: (result, { employeeUserId }) => {
      operation.settle();
      qc.setQueryData(humanResourcesQueryKeys.hr.reportingLine(employeeUserId), result.line);
      void invalidateHrWorkforceQueries(qc, employeeUserId);
    },
  });
}

export function useConfirmReportingFallback() {
  const qc = useQueryClient();
  const operation = useIdempotentOperation();
  return useAuthorizedMutation("hr:reporting-lines:manage", {
    mutationKey: ["hr", "reportingLines", "confirmFallback"],
    mutationFn: (employeeUserId: string) =>
      apiClient.post<ReportingLineView>(
        `/hr/reporting-lines/${employeeUserId}/confirm-fallback`,
        undefined,
        operation.configFor(employeeUserId),
        reportingLineViewLazy,
      ),
    onSuccess: (line, employeeUserId) => {
      operation.settle();
      qc.setQueryData(humanResourcesQueryKeys.hr.reportingLine(employeeUserId), line);
      void invalidateHrWorkforceQueries(qc, employeeUserId);
    },
  });
}
