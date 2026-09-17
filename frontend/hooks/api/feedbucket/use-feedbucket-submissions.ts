"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { FeedbucketSubmissionRow } from "@/hooks/api/feedbucket/feedbucket-schema";
import { lazyContract } from "@/lib/api-envelope";
import { growthAndSignQueryKeys } from "@/lib/query-keys/growth-and-sign";
import type {
  FeedbucketMediaKind,
  FeedbucketSubmission,
  PaginatedFeedbucketSubmissions,
  ListFeedbucketSubmissionsQuery,
  UpdateFeedbucketSubmissionInput,
} from "@/types/feedbucket";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";

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

export function useFeedbucketSubmissions(params?: ListFeedbucketSubmissionsQuery) {
  return useGatedQuery("feedbucket:submissions:view", {
    queryKey: growthAndSignQueryKeys.feedbucket.submissions(params),
    queryFn: ({ signal }) =>
      apiClient.get<PaginatedFeedbucketSubmissions>(
        "/feedbucket/submissions",
        params, signal, feedbucketSubmissionListC,
      ),
    staleTime: 30_000,
  });
}

export function useFeedbucketSubmission(submissionId: number) {
  return useGatedQuery("feedbucket:submissions:view", {
    queryKey: growthAndSignQueryKeys.feedbucket.submission(submissionId),
    queryFn: ({ signal }) =>
      apiClient.get<FeedbucketSubmission>(`/feedbucket/submissions/${submissionId}`, undefined, signal, feedbucketSubmissionDetailC),
    staleTime: 30_000,
    enabled: submissionId > 0,
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
    },
  });
}
