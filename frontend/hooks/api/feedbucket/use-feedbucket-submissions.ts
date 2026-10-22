"use client";

import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  FeedbucketClassifyResult,
  FeedbucketMarkDuplicateResult,
  FeedbucketSubmissionRow,
  FeedbucketUnmarkDuplicateResult,
} from "@/hooks/api/feedbucket/feedbucket-schema";
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
import { feedbucketSubmissionQueryOptions } from "./use-feedbucket-submissions-read-options";

const feedbucketSubmissionListC = lazyContract(() =>
  import("@/hooks/api/feedbucket/feedbucket-schema").then(
    (m) => m.feedbucketSubmissionListContract,
  ),
);
const feedbucketSubmissionDetailC = lazyContract(() =>
  import("@/hooks/api/feedbucket/feedbucket-schema").then(
    (m) => m.feedbucketSubmissionDetailContract,
  ),
);
const feedbucketUpdateSubmissionC = lazyContract(() =>
  import("@/hooks/api/feedbucket/feedbucket-schema").then(
    (m) => m.feedbucketUpdateSubmissionContract,
  ),
);
const feedbucketConvertTicketC = lazyContract(() =>
  import("@/hooks/api/feedbucket/feedbucket-schema").then(
    (m) => m.feedbucketConvertTicketContract,
  ),
);
const feedbucketDeleteSubmissionC = lazyContract(() =>
  import("@/hooks/api/feedbucket/feedbucket-schema").then(
    (m) => m.feedbucketDeleteSubmissionContract,
  ),
);
const feedbucketBulkSubmissionsC = lazyContract(() =>
  import("@/hooks/api/feedbucket/feedbucket-schema").then(
    (m) => m.feedbucketBulkSubmissionsContract,
  ),
);
const feedbucketClassifySubmissionC = lazyContract(() =>
  import("@/hooks/api/feedbucket/feedbucket-schema").then(
    (m) => m.feedbucketClassifySubmissionContract,
  ),
);
const feedbucketMarkDuplicateC = lazyContract(() =>
  import("@/hooks/api/feedbucket/feedbucket-schema").then(
    (m) => m.feedbucketMarkDuplicateContract,
  ),
);
const feedbucketUnmarkDuplicateC = lazyContract(() =>
  import("@/hooks/api/feedbucket/feedbucket-schema").then(
    (m) => m.feedbucketUnmarkDuplicateContract,
  ),
);
const feedbucketCaptureSubmissionC = lazyContract(() =>
  import("@/hooks/api/feedbucket/feedbucket-schema").then(
    (m) => m.feedbucketCaptureSubmissionContract,
  ),
);
const feedbucketSubmissionFacetsC = lazyContract(() =>
  import("@/hooks/api/feedbucket/feedbucket-schema").then(
    (m) => m.feedbucketSubmissionFacetsContract,
  ),
);

type SubmissionListRow = PaginatedFeedbucketSubmissions["data"][number];

interface SummaryFeedbackCounts {
  evidence: {
    feedbackCount: number;
    feedbackLast30d: number;
    themedCount: number;
    latestFeedbackAt: string | null;
  };
}

function patchSubmissionListRows(
  qc: QueryClient,
  patch: (row: SubmissionListRow) => SubmissionListRow,
) {
  qc.setQueriesData<PaginatedFeedbucketSubmissions>(
    { queryKey: growthAndSignQueryKeys.feedbucket.submissions() },
    (old) =>
      old && Array.isArray(old.data)
        ? { ...old, data: old.data.map(patch) }
        : old,
  );
}

function shiftDuplicateCount(
  qc: QueryClient,
  submissionId: number,
  delta: number,
) {
  patchSubmissionListRows(qc, (row) =>
    row.id === submissionId
      ? { ...row, duplicateCount: Math.max(0, row.duplicateCount + delta) }
      : row,
  );
  qc.setQueryData<FeedbucketSubmission>(
    growthAndSignQueryKeys.feedbucket.submission(submissionId),
    (old) =>
      old
        ? { ...old, duplicateCount: Math.max(0, old.duplicateCount + delta) }
        : old,
  );
  void qc.invalidateQueries({
    queryKey: growthAndSignQueryKeys.feedbucket.submission(submissionId),
    exact: true,
    refetchType: "none",
  });
}

export function useFeedbucketSubmissions(
  params?: ListFeedbucketSubmissionsQuery,
  options?: { enabled?: boolean },
) {
  return useGatedQuery("feedbucket:submissions:view", {
    queryKey: growthAndSignQueryKeys.feedbucket.submissions(params),
    queryFn: ({ signal }) =>
      apiClient.get<PaginatedFeedbucketSubmissions>(
        "/feedbucket/submissions",
        params,
        signal,
        feedbucketSubmissionListC,
      ),
    enabled: options?.enabled ?? true,
    staleTime: 30_000,
    ...INLINE_READ_ERROR,
  });
}

export function useFeedbucketSubmission(submissionId: number) {
  return useGatedQuery("feedbucket:submissions:view", {
    ...feedbucketSubmissionQueryOptions(submissionId),
    queryFn: ({ signal }) =>
      apiClient.get<FeedbucketSubmission>(
        `/feedbucket/submissions/${submissionId}`,
        undefined,
        signal,
        feedbucketSubmissionDetailC,
      ),
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
        input,
        undefined,
        feedbucketUpdateSubmissionC,
      ),
    onSuccess: (_, { submissionId }) => {
      void qc.invalidateQueries({
        queryKey: growthAndSignQueryKeys.feedbucket.submission(submissionId),
      });
      void qc.invalidateQueries({
        queryKey: growthAndSignQueryKeys.feedbucket.all,
      });
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
            queryKey: growthAndSignQueryKeys.feedbucket.submission(
              item.submissionId,
            ),
          });
      void qc.invalidateQueries({
        queryKey: growthAndSignQueryKeys.feedbucket.all,
      });
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
        undefined,
        undefined,
        feedbucketDeleteSubmissionC,
      ),
    onSuccess: (_, { submissionId }) => {
      qc.removeQueries({
        queryKey: growthAndSignQueryKeys.feedbucket.submission(submissionId),
      });
      void qc.invalidateQueries({
        queryKey: growthAndSignQueryKeys.feedbucket.all,
      });
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
        undefined,
        undefined,
        feedbucketDeleteSubmissionC,
      ),
    onSuccess: (_, { submissionId }) => {
      void qc.invalidateQueries({
        queryKey: growthAndSignQueryKeys.feedbucket.submission(submissionId),
      });
      void qc.invalidateQueries({
        queryKey: growthAndSignQueryKeys.feedbucket.all,
      });
    },
  });
}

export function useConvertFeedbucketToTicket() {
  const qc = useQueryClient();
  return useAuthorizedMutation("feedbucket:submissions:manage", {
    mutationKey: ["feedbucket", "submissions", "convert-to-ticket"],
    mutationFn: ({
      submissionId,
      projectId,
      assigneeId,
    }: {
      submissionId: number;
      projectId?: number;
      assigneeId?: string;
    }) =>
      apiClient.post<{ ticketId: number }>(
        `/feedbucket/submissions/${submissionId}/convert-to-ticket`,
        projectId !== undefined || assigneeId !== undefined
          ? { projectId, assigneeId }
          : undefined,
        undefined,
        feedbucketConvertTicketC,
      ),
    onSuccess: (_, { submissionId }) => {
      void qc.invalidateQueries({
        queryKey: growthAndSignQueryKeys.feedbucket.submission(submissionId),
      });
      void qc.invalidateQueries({
        queryKey: growthAndSignQueryKeys.feedbucket.all,
      });
      void qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.tickets(),
      });
    },
  });
}

export function useFeedbucketSubmissionFacets(
  params?: {
    managedProductId?: number;
    widgetId?: number;
  },
  options?: { enabled?: boolean },
) {
  return useGatedQuery("feedbucket:submissions:view", {
    queryKey: growthAndSignQueryKeys.feedbucket.submissionFacets(params),
    queryFn: ({ signal }) =>
      apiClient.get<FeedbucketSubmissionFacets>(
        "/feedbucket/submissions/facets",
        params,
        signal,
        feedbucketSubmissionFacetsC,
      ),
    enabled: options?.enabled ?? true,
    staleTime: 30_000,
    ...INLINE_READ_ERROR,
  });
}

function recordCapturedFeedback(
  qc: QueryClient,
  managedProductId: number,
  themed: boolean,
) {
  const at = new Date().toISOString();
  qc.setQueriesData<SummaryFeedbackCounts>(
    {
      queryKey:
        buildWorkQueryKeys.projects.managedProducts.summary(managedProductId),
    },
    (prev) => {
      if (!prev?.evidence) return prev;
      return {
        ...prev,
        evidence: {
          ...prev.evidence,
          feedbackCount: prev.evidence.feedbackCount + 1,
          feedbackLast30d: prev.evidence.feedbackLast30d + 1,
          themedCount: prev.evidence.themedCount + (themed ? 1 : 0),
          latestFeedbackAt: at,
        },
      };
    },
  );
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
      apiClient.post<{
        submissionId: number;
        widgetId: number;
        widgetCreated: boolean;
      }>(
        "/feedbucket/submissions/capture",
        input,
        operation.configFor(input),
        feedbucketCaptureSubmissionC,
      ),
    onSuccess: (_result, input) => {
      operation.settle();
      recordCapturedFeedback(qc, input.managedProductId, Boolean(input.theme));
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
    FeedbucketClassifyResult,
    Error,
    { submissionId: number; input: ClassifySubmissionInput }
  >("feedbucket:submissions:update", {
    mutationKey: ["feedbucket", "submissions", "classify"],
    mutationFn: ({ submissionId, input }) =>
      apiClient.patch<FeedbucketClassifyResult>(
        `/feedbucket/submissions/${submissionId}/classification`,
        input,
        operation.configFor(input),
        feedbucketClassifySubmissionC,
      ),
    onSuccess: (result, { submissionId }) => {
      operation.settle();
      qc.setQueryData(
        growthAndSignQueryKeys.feedbucket.submission(submissionId),
        (old: Record<string, unknown> | undefined) =>
          old ? { ...old, ...result } : old,
      );
      patchSubmissionListRows(qc, (row) =>
        row.id === submissionId
          ? {
              ...row,
              theme: result.theme,
              segment: result.segment,
              sentiment: result.sentiment,
              consentStatus: result.consentStatus,
              consentRecordedAt: result.consentRecordedAt,
              updatedAt: result.updatedAt,
            }
          : row,
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
    FeedbucketMarkDuplicateResult,
    Error,
    { submissionId: number; duplicateOfId: number; expectedRevision?: string }
  >("feedbucket:submissions:update", {
    mutationKey: ["feedbucket", "submissions", "mark-duplicate"],
    mutationFn: ({ submissionId, duplicateOfId, expectedRevision }) =>
      apiClient.post<FeedbucketMarkDuplicateResult>(
        `/feedbucket/submissions/${submissionId}/mark-duplicate`,
        { duplicateOfId, ...(expectedRevision ? { expectedRevision } : {}) },
        operation.configFor({ submissionId, duplicateOfId }),
        feedbucketMarkDuplicateC,
      ),
    onSuccess: (result, { submissionId }) => {
      operation.settle();
      qc.setQueryData(
        growthAndSignQueryKeys.feedbucket.submission(submissionId),
        (old: Record<string, unknown> | undefined) =>
          old ? { ...old, duplicateOfId: result.duplicateOfId } : old,
      );
      patchSubmissionListRows(qc, (row) =>
        row.id === submissionId
          ? { ...row, duplicateOfId: result.duplicateOfId }
          : row,
      );
      shiftDuplicateCount(qc, result.duplicateOfId, 1);
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
  const operation = useIdempotentOperation();
  return useAuthorizedMutation<
    FeedbucketUnmarkDuplicateResult,
    Error,
    { submissionId: number; expectedRevision?: string }
  >("feedbucket:submissions:update", {
    mutationKey: ["feedbucket", "submissions", "unmark-duplicate"],
    mutationFn: ({ submissionId, expectedRevision }) =>
      apiClient.post<FeedbucketUnmarkDuplicateResult>(
        `/feedbucket/submissions/${submissionId}/unmark-duplicate`,
        expectedRevision ? { expectedRevision } : {},
        operation.configFor({ submissionId }),
        feedbucketUnmarkDuplicateC,
      ),
    onSuccess: (_, { submissionId }) => {
      operation.settle();
      const previousOriginalId = qc.getQueryData<FeedbucketSubmission>(
        growthAndSignQueryKeys.feedbucket.submission(submissionId),
      )?.duplicateOfId;
      qc.setQueryData(
        growthAndSignQueryKeys.feedbucket.submission(submissionId),
        (old: Record<string, unknown> | undefined) =>
          old ? { ...old, duplicateOfId: null } : old,
      );
      patchSubmissionListRows(qc, (row) =>
        row.id === submissionId ? { ...row, duplicateOfId: null } : row,
      );
      if (previousOriginalId) shiftDuplicateCount(qc, previousOriginalId, -1);
      void qc.invalidateQueries({
        queryKey: growthAndSignQueryKeys.feedbucket.submissions(),
        exact: false,
        refetchType: "none",
      });
    },
  });
}

