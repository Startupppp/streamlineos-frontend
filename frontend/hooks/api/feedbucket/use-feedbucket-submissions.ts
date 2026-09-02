"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  FeedbucketSubmission,
  PaginatedFeedbucketSubmissions,
  ListFeedbucketSubmissionsQuery,
  UpdateFeedbucketSubmissionInput,
} from "@/types/feedbucket";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export function useFeedbucketSubmissions(params?: ListFeedbucketSubmissionsQuery) {
  return useQuery({
    queryKey: queryKeys.feedbucket.submissions(params as Record<string, unknown>),
    queryFn: ({ signal }) =>
      apiClient.get<PaginatedFeedbucketSubmissions>(
        "/feedbucket/submissions",
        params as Record<string, unknown>, signal,
      ),
    staleTime: 30_000,
  });
}

export function useFeedbucketSubmission(submissionId: number) {
  return useQuery({
    queryKey: queryKeys.feedbucket.submission(submissionId),
    queryFn: ({ signal }) =>
      apiClient.get<FeedbucketSubmission>(`/feedbucket/submissions/${submissionId}`, undefined, signal),
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
      apiClient.patch<FeedbucketSubmission>(
        `/feedbucket/submissions/${submissionId}`,
        input,
      ),
    onSuccess: (_, { submissionId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.feedbucket.submission(submissionId) });
      void qc.invalidateQueries({ queryKey: queryKeys.feedbucket.all });
    },
  });
}

export function useConvertFeedbucketToTicket() {
  const qc = useQueryClient();
  return useAuthorizedMutation("feedbucket:submissions:manage", {
    mutationKey: ["feedbucket", "submissions", "convert-to-ticket"],
    mutationFn: (submissionId: number) =>
      apiClient.post<{ ticketId: number }>(
        `/feedbucket/submissions/${submissionId}/convert-to-ticket`,
      ),
    onSuccess: (_, submissionId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.feedbucket.submission(submissionId) });
      void qc.invalidateQueries({ queryKey: queryKeys.feedbucket.all });
    },
  });
}
