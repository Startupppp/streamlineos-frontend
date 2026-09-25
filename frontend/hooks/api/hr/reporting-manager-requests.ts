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
  HrReportingManagerRequest,
  HrReportingManagerRequestPage,
  ReportingManagerRequestStatus,
  ReviewReportingManagerRequestInput,
  ReviewReportingManagerRequestResponse,
} from "@/hooks/api/hr/reporting-manager-requests-schema";

/** HR review queue (CONTRACT §4.14–§4.16), gated on `hr:reporting-lines:review`. */

const pageLazy = lazyContract(() =>
  import("@/hooks/api/hr/reporting-manager-requests-schema").then((m) => m.hrReportingManagerRequestPageContract),
);
const requestLazy = lazyContract(() =>
  import("@/hooks/api/hr/reporting-manager-requests-schema").then((m) => m.hrReportingManagerRequestContract),
);
const reviewLazy = lazyContract(() =>
  import("@/hooks/api/hr/reporting-manager-requests-schema").then(
    (m) => m.reviewReportingManagerRequestResponseContract,
  ),
);

export interface ReportingManagerRequestFilters {
  status?: ReportingManagerRequestStatus;
  cursor?: string;
  limit?: number;
}

export function useReportingManagerRequests(filters: ReportingManagerRequestFilters) {
  const canReview = useCan("hr:reporting-lines:review");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.reportingManagerRequests({
      status: filters.status ?? null,
      cursor: filters.cursor ?? null,
      limit: filters.limit ?? null,
    }),
    queryFn: ({ signal }) =>
      apiClient.get<HrReportingManagerRequestPage>(
        "/hr/reporting-manager-requests",
        {
          ...(filters.status ? { status: filters.status } : {}),
          ...(filters.cursor ? { cursor: filters.cursor } : {}),
          ...(filters.limit ? { limit: String(filters.limit) } : {}),
        },
        signal,
        pageLazy,
      ),
    enabled: hrEnabled && canReview,
    staleTime: 30_000,
    placeholderData: (previous) => previous,
    ...INLINE_READ_ERROR,
  });
}

export function useReportingManagerRequest(requestId: string | null) {
  const canReview = useCan("hr:reporting-lines:review");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.reportingManagerRequest(requestId ?? ""),
    queryFn: ({ signal }) =>
      apiClient.get<HrReportingManagerRequest>(
        `/hr/reporting-manager-requests/${requestId ?? ""}`,
        undefined,
        signal,
        requestLazy,
      ),
    enabled: hrEnabled && canReview && requestId !== null && requestId !== "",
    staleTime: 60_000,
    ...INLINE_READ_ERROR,
  });
}

export function useReviewReportingManagerRequest() {
  const qc = useQueryClient();
  const operation = useIdempotentOperation();
  return useAuthorizedMutation("hr:reporting-lines:review", {
    mutationKey: ["hr", "reportingManagerRequests", "review"],
    mutationFn: ({ requestId, ...body }: ReviewReportingManagerRequestInput & { requestId: string }) =>
      apiClient.post<ReviewReportingManagerRequestResponse>(
        `/hr/reporting-manager-requests/${requestId}/review`,
        body,
        operation.configFor({ requestId, ...body }),
        reviewLazy,
      ),
    onSuccess: (result, { requestId }) => {
      operation.settle();
      qc.setQueryData(humanResourcesQueryKeys.hr.reportingManagerRequest(requestId), result.request);
      void invalidateHrWorkforceQueries(qc, result.request.employee.userId, [
        humanResourcesQueryKeys.hr.reportingManagerRequests(),
      ]);
    },
  });
}
