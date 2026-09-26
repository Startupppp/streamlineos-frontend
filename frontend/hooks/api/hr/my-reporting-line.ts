"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useModuleEnabled } from "@/hooks/api/access";
import { useIdempotentOperation } from "@/hooks/common/use-idempotent-operation";
import { NULL_CURSOR_YET } from "@/hooks/api/cursor-page-param";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import type { ManagerCandidates, MyReportingLine } from "@/hooks/api/hr/reporting-lines-schema";
import type {
  CreateReportingManagerRequestInput,
  MyReportingManagerRequest,
} from "@/hooks/api/hr/reporting-manager-requests-schema";

/**
 * Employee self-service (CONTRACT §4.8–§4.13). Every route is `@Universal` behind
 * `@RequireModule("hr")`: the subject is the session, so the only gate is the module.
 */

const myLineLazy = lazyContract(() =>
  import("@/hooks/api/hr/reporting-lines-schema").then((m) => m.myReportingLineContract),
);
const myCandidatesLazy = lazyContract(() =>
  import("@/hooks/api/hr/reporting-lines-schema").then((m) => m.managerCandidatesContract),
);
const myRequestLazy = lazyContract(() =>
  import("@/hooks/api/hr/reporting-manager-requests-schema").then((m) => m.myReportingManagerRequestContract),
);
const myRequestPageLazy = lazyContract(() =>
  import("@/hooks/api/hr/reporting-manager-requests-schema").then((m) => m.myReportingManagerRequestPageContract),
);

const MY_REQUESTS_PAGE_SIZE = 20;

export function useMyReportingLine() {
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.myReportingLine(),
    queryFn: ({ signal }) => apiClient.get<MyReportingLine>("/me/reporting-line", undefined, signal, myLineLazy),
    enabled: hrEnabled,
    staleTime: 60_000,
    ...INLINE_READ_ERROR,
  });
}

export function useMyReportingManagerRequests(options?: { enabled?: boolean }) {
  const hrEnabled = useModuleEnabled("hr");
  return useInfiniteQuery({
    queryKey: humanResourcesQueryKeys.hr.myReportingManagerRequests(),
    initialPageParam: NULL_CURSOR_YET,
    queryFn: ({ pageParam, signal }) =>
      apiClient.get(
        "/me/reporting-manager-requests",
        { limit: String(MY_REQUESTS_PAGE_SIZE), ...(pageParam !== null ? { cursor: pageParam } : {}) },
        signal,
        myRequestPageLazy,
      ),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: hrEnabled && (options?.enabled ?? true),
    staleTime: 30_000,
  });
}

export function useMyManagerCandidates(q: string, options?: { enabled?: boolean }) {
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.myManagerCandidates(q),
    queryFn: ({ signal }) =>
      apiClient.get<ManagerCandidates>(
        "/me/reporting-manager-requests/manager-candidates",
        q ? { q } : undefined,
        signal,
        myCandidatesLazy,
      ),
    enabled: hrEnabled && (options?.enabled ?? true),
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  });
}

function useInvalidateMyRequests() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.myReportingManagerRequests() }),
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.myReportingLine() }),
    ]);
}

export function useCreateReportingManagerRequest() {
  const invalidate = useInvalidateMyRequests();
  const operation = useIdempotentOperation();
  return useMutation({
    mutationKey: ["me", "reportingManagerRequests", "create"],
    mutationFn: (input: CreateReportingManagerRequestInput) =>
      apiClient.post<MyReportingManagerRequest>(
        "/me/reporting-manager-requests",
        input,
        operation.configFor(input),
        myRequestLazy,
      ),
    onSuccess: () => {
      operation.settle();
      void invalidate();
    },
  });
}

export function useCancelReportingManagerRequest() {
  const invalidate = useInvalidateMyRequests();
  const operation = useIdempotentOperation();
  return useMutation({
    mutationKey: ["me", "reportingManagerRequests", "cancel"],
    mutationFn: (requestId: string) =>
      apiClient.post<MyReportingManagerRequest>(
        `/me/reporting-manager-requests/${requestId}/cancel`,
        undefined,
        operation.configFor(requestId),
        myRequestLazy,
      ),
    onSuccess: () => {
      operation.settle();
      void invalidate();
    },
  });
}

export function useRespondReportingManagerRequest() {
  const invalidate = useInvalidateMyRequests();
  const operation = useIdempotentOperation();
  return useMutation({
    mutationKey: ["me", "reportingManagerRequests", "respond"],
    mutationFn: ({ requestId, reason }: { requestId: string; reason: string }) =>
      apiClient.post<MyReportingManagerRequest>(
        `/me/reporting-manager-requests/${requestId}/respond`,
        { reason },
        operation.configFor({ requestId, reason }),
        myRequestLazy,
      ),
    onSuccess: () => {
      operation.settle();
      void invalidate();
    },
  });
}
