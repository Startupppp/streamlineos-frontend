"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { FeedbucketSubmissionRow } from "@/hooks/api/feedbucket/feedbucket-schema";
import { lazyContract } from "@/lib/api-envelope";
import { growthAndSignQueryKeys } from "@/lib/query-keys/growth-and-sign";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import type {
  BulkFeedbucketSubmissionsInput,
  BulkFeedbucketSubmissionsResult,
  CaptureSubmissionInput,
  ClassifySubmissionInput,
  FeedbucketMediaKind,
  FeedbucketSubmission,
  FeedbucketSubmissionFacets,
  PaginatedFeedbucketSubmissions,
  ListFeedbucketSubmissionsQuery,
  UpdateFeedbucketSubmissionInput,
} from "@/types/feedbucket";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useIdempotentOperation } from "@/hooks/common/use-idempotent-operation";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";

const feedbucketSubmissionListC = lazyContract(() =>
  import("@/hooks/api/feedbucket/feedbucket-schema").then((m) => m.feedbucketSubmissionListContract),
);
const feedbucketSubmissionDetailC = lazyContract(() =>
  import("@/hooks/api/feedbucket/feedbucket-schema").then((m) => m.feedbucketSubmissionDetailContract),
);
const feedbucketUpdateSubmissionC = lazyContract(() =>
  import("@/hooks/api/feedbucket/feedbucket-schema").then((m) => m.feedbucketUpdateSubmissionContract),
);
const feedbucketConvertTicketC = lazyContract(() =>
  import("@/hooks/api/feedbucket/feedbucket-schema").then((m) => m.feedbucketConvertTicketContract),
);
const feedbucketDeleteSubmissionC = lazyContract(() =>
  import("@/hooks/api/feedbucket/feedbucket-schema").then((m) => m.feedbucketDeleteSubmissionContract),
);
const feedbucketBulkSubmissionsC = lazyContract(() =>
  import("@/hooks/api/feedbucket/feedbucket-schema").then((m) => m.feedbucketBulkSubmissionsContract),
);
const feedbucketClassifySubmissionC = lazyContract(() =>
  import("@/hooks/api/feedbucket/feedbucket-schema").then((m) => m.feedbucketClassifySubmissionContract),
);
const feedbucketMarkDuplicateC = lazyContract(() =>
  import("@/hooks/api/feedbucket/feedbucket-schema").then((m) => m.feedbucketMarkDuplicateContract),
);
const feedbucketUnmarkDuplicateC = lazyContract(() =>
  import("@/hooks/api/feedbucket/feedbucket-schema").then((m) => m.feedbucketUnmarkDuplicateContract),
);
const feedbucketCaptureSubmissionC = lazyContract(() =>
  import("@/hooks/api/feedbucket/feedbucket-schema").then((m) => m.feedbucketCaptureSubmissionContract),
);
const feedbucketSubmissionFacetsC = lazyContract(() =>
  import("@/hooks/api/feedbucket/feedbucket-schema").then((m) => m.feedbucketSubmissionFacetsContract),
);

export function useFeedbucketSubmissions(params?: ListFeedbucketSubmissionsQuery) {
  return useGatedQuery("feedbucket:submissions:view", {
    queryKey: growthAndSignQueryKeys.feedbucket.submissions(params),
    queryFn: ({ signal }) =>
      apiClient.get<PaginatedFeedbucketSubmissions>(
        "/feedbucket/submissions",
        params, signal, feedbucketSubmissionListC,
      ),
    staleTime: 30_000,
    ...INLINE_READ_ERROR,
  });
}

export function useFeedbucketSubmission(submissionId: number) {
  return useGatedQuery("feedbucket:submissions:view", {
    queryKey: growthAndSignQueryKeys.feedbucket.submission(submissionId),
    queryFn: ({ signal }) =>
      apiClient.get<FeedbucketSubmission>(`/feedbucket/submissions/${submissionId}`, undefined, signal, feedbucketSubmissionDetailC),
    staleTime: 30_000,
    enabled: submissionId > 0,
    throwOnError: false,
  });
}

export function useUpdateFeedbucketSubmission() {
  const qc = useQueryClient();
  return useAuthorizedMutation("feedbucket:submissions:update", {
    mutationKey: ["feedbucket", "submissions", "update"],
    mutationFn: ({
      submissionId,
      input,
    }: {
      submissionId: number;
      input: UpdateFeedbucketSubmissionInput;
    }) =>
      apiClient.patch<FeedbucketSubmissionRow>(
        `/feedbucket/submissions/${submissionId}`,
        input, undefined, feedbucketUpdateSubmissionC,
      ),
    onSuccess: (_, { submissionId }) => {
      void qc.invalidateQueries({ queryKey: growthAndSignQueryKeys.feedbucket.submission(submissionId) });
      void qc.invalidateQueries({ queryKey: growthAndSignQueryKeys.feedbucket.all });
    },
  });
}

export function useBulkMutateFeedbucketSubmissions() {
  const qc = useQueryClient();
  const operation = useIdempotentOperation();
  return useAuthorizedMutation<
    BulkFeedbucketSubmissionsResult,
    Error,
    BulkFeedbucketSubmissionsInput
  >("feedbucket:submissions:update", {
    mutationKey: ["feedbucket", "submissions", "bulk"],
    mutationFn: (input) =>
      apiClient.post<BulkFeedbucketSubmissionsResult>(
        "/feedbucket/submissions/bulk",
        input,
        operation.configFor(input),
        feedbucketBulkSubmissionsC,
      ),
    onSuccess: (result) => {
      operation.settle();
      for (const item of result.results)
        if (item.outcome !== "skipped")
          qc.removeQueries({
            queryKey: growthAndSignQueryKeys.feedbucket.submission(item.submissionId),
          });
      void qc.invalidateQueries({ queryKey: growthAndSignQueryKeys.feedbucket.all });
    },
  });
}

export function useDeleteFeedbucketSubmission() {
  const qc = useQueryClient();
  return useAuthorizedMutation("feedbucket:submissions:delete", {
    mutationKey: ["feedbucket", "submissions", "delete"],
    mutationFn: ({ submissionId }: { submissionId: number }) =>
      apiClient.delete<{ success: true }>(
        `/feedbucket/submissions/${submissionId}`,
        undefined, undefined, feedbucketDeleteSubmissionC,
      ),
    onSuccess: (_, { submissionId }) => {
      qc.removeQueries({ queryKey: growthAndSignQueryKeys.feedbucket.submission(submissionId) });
      void qc.invalidateQueries({ queryKey: growthAndSignQueryKeys.feedbucket.all });
    },
  });
}

export function useDeleteFeedbucketSubmissionMedia() {
  const qc = useQueryClient();
  return useAuthorizedMutation("feedbucket:submissions:delete", {
    mutationKey: ["feedbucket", "submissions", "delete-media"],
    mutationFn: ({
      submissionId,
      mediaKind,
    }: {
      submissionId: number;
      mediaKind: FeedbucketMediaKind;
    }) =>
      apiClient.delete<{ success: true }>(
        `/feedbucket/submissions/${submissionId}/media/${mediaKind}`,
        undefined, undefined, feedbucketDeleteSubmissionC,
      ),
    onSuccess: (_, { submissionId }) => {
      void qc.invalidateQueries({ queryKey: growthAndSignQueryKeys.feedbucket.submission(submissionId) });
      void qc.invalidateQueries({ queryKey: growthAndSignQueryKeys.feedbucket.all });
    },
  });
}

export function useConvertFeedbucketToTicket() {
  const qc = useQueryClient();
  return useAuthorizedMutation("feedbucket:submissions:manage", {
    mutationKey: ["feedbucket", "submissions", "convert-to-ticket"],
    mutationFn: ({ submissionId, projectId, assigneeId }: { submissionId: number; projectId?: number; assigneeId?: string }) =>
      apiClient.post<{ ticketId: number }>(
        `/feedbucket/submissions/${submissionId}/convert-to-ticket`,
        projectId !== undefined || assigneeId !== undefined ? { projectId, assigneeId } : undefined,
        undefined, feedbucketConvertTicketC,
      ),
    onSuccess: (_, { submissionId }) => {
      void qc.invalidateQueries({ queryKey: growthAndSignQueryKeys.feedbucket.submission(submissionId) });
      void qc.invalidateQueries({ queryKey: growthAndSignQueryKeys.feedbucket.all });
      void qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.tickets() });
    },
  });
}

export function useFeedbucketSubmissionFacets(params?: { managedProductId?: number; widgetId?: number }) {
  return useGatedQuery("feedbucket:submissions:view", {
    queryKey: growthAndSignQueryKeys.feedbucket.submissionFacets(params),
    queryFn: ({ signal }) =>
      apiClient.get<FeedbucketSubmissionFacets>(
        "/feedbucket/submissions/facets",
        params, signal, feedbucketSubmissionFacetsC,
      ),
    staleTime: 30_000,
    ...INLINE_READ_ERROR,
  });
}

export function useCaptureSubmission() {
  const qc = useQueryClient();
  const operation = useIdempotentOperation();
  return useAuthorizedMutation<
    { submissionId: number; widgetId: number; widgetCreated: boolean },
    Error,
    CaptureSubmissionInput
  >("feedbucket:submissions:manage", {
    mutationKey: ["feedbucket", "submissions", "capture"],
    mutationFn: (input) =>
      apiClient.post<{ submissionId: number; widgetId: number; widgetCreated: boolean }>(
        "/feedbucket/submissions/capture",
        input,
        operation.configFor(input),
        feedbucketCaptureSubmissionC,
      ),
    onSuccess: () => {
      operation.settle();
      void qc.invalidateQueries({
        queryKey: growthAndSignQueryKeys.feedbucket.submissions(),
        exact: false,
        refetchType: "none",
      });
      void qc.invalidateQueries({
        queryKey: growthAndSignQueryKeys.feedbucket.submissionFacets(),
        exact: false,
        refetchType: "none",
      });
    },
  });
}

export function useClassifySubmission() {
  const qc = useQueryClient();
  const operation = useIdempotentOperation();
  return useAuthorizedMutation<
    { success: true; data: { id: number; theme: string | null; segment: string | null; sentiment: string | null; consentStatus: string; consentRecordedAt: string | null; updatedAt: string } },
    Error,
    { submissionId: number; input: ClassifySubmissionInput }
  >("feedbucket:submissions:update", {
    mutationKey: ["feedbucket", "submissions", "classify"],
    mutationFn: ({ submissionId, input }) =>
      apiClient.patch<{ success: true; data: { id: number; theme: string | null; segment: string | null; sentiment: string | null; consentStatus: string; consentRecordedAt: string | null; updatedAt: string } }>(
        `/feedbucket/submissions/${submissionId}/classification`,
        input,
        operation.configFor(input),
        feedbucketClassifySubmissionC,
      ),
    onSuccess: (result, { submissionId }) => {
      operation.settle();
      qc.setQueryData(
        growthAndSignQueryKeys.feedbucket.submission(submissionId),
        (old: Record<string, unknown> | undefined) => old ? { ...old, ...result.data } : old,
      );
      void qc.invalidateQueries({
        queryKey: growthAndSignQueryKeys.feedbucket.submissions(),
        exact: false,
        refetchType: "none",
      });
    },
  });
}

export function useMarkDuplicate() {
  const qc = useQueryClient();
  const operation = useIdempotentOperation();
  return useAuthorizedMutation<
    { success: true; data: { id: number; duplicateOfId: number } },
    Error,
    { submissionId: number; duplicateOfId: number }
  >("feedbucket:submissions:update", {
    mutationKey: ["feedbucket", "submissions", "mark-duplicate"],
    mutationFn: ({ submissionId, duplicateOfId }) =>
      apiClient.post<{ success: true; data: { id: number; duplicateOfId: number } }>(
        `/feedbucket/submissions/${submissionId}/mark-duplicate`,
        { duplicateOfId },
        operation.configFor({ submissionId, duplicateOfId }),
        feedbucketMarkDuplicateC,
      ),
    onSuccess: (result, { submissionId }) => {
      operation.settle();
      qc.setQueryData(
        growthAndSignQueryKeys.feedbucket.submission(submissionId),
        (old: Record<string, unknown> | undefined) => old ? { ...old, duplicateOfId: result.data.duplicateOfId } : old,
      );
      void qc.invalidateQueries({
        queryKey: growthAndSignQueryKeys.feedbucket.submissions(),
        exact: false,
        refetchType: "none",
      });
    },
  });
}

export function useUnmarkDuplicate() {
  const qc = useQueryClient();
  return useAuthorizedMutation<
    { success: true; data: { id: number } },
    Error,
    { submissionId: number }
  >("feedbucket:submissions:update", {
    mutationKey: ["feedbucket", "submissions", "unmark-duplicate"],
    mutationFn: ({ submissionId }) =>
      apiClient.post<{ success: true; data: { id: number } }>(
        `/feedbucket/submissions/${submissionId}/unmark-duplicate`,
        undefined,
        undefined,
        feedbucketUnmarkDuplicateC,
      ),
    onSuccess: (_, { submissionId }) => {
      qc.setQueryData(
        growthAndSignQueryKeys.feedbucket.submission(submissionId),
        (old: Record<string, unknown> | undefined) => old ? { ...old, duplicateOfId: null } : old,
      );
      void qc.invalidateQueries({
        queryKey: growthAndSignQueryKeys.feedbucket.submissions(),
        exact: false,
        refetchType: "none",
      });
    },
  });
}
