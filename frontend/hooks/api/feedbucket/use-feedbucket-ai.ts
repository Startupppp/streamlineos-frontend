"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { growthAndSignQueryKeys } from "@/lib/query-keys/growth-and-sign";
import type { FeedbucketAiAnalysis, FeedbucketAiTicketType } from "@/types/feedbucket";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export function useAnalyzeFeedbucketSubmission() {
  const qc = useQueryClient();
  return useAuthorizedMutation("feedbucket:submissions:ai", {
    mutationKey: ["feedbucket", "submissions", "ai-analyze"],
    mutationFn: ({ submissionId, force }: { submissionId: number; force?: boolean }) =>
      apiClient.post<FeedbucketAiAnalysis>(
        `/feedbucket/submissions/${submissionId}/ai-analyze`,
        { force: force ?? false },
      ),
    onSuccess: (_, { submissionId }) => {
      void qc.invalidateQueries({ queryKey: growthAndSignQueryKeys.feedbucket.submission(submissionId) });
    },
  });
}

export function useCreateTicketFromFeedbucketAi() {
  const qc = useQueryClient();
  return useAuthorizedMutation("feedbucket:submissions:manage", {
    mutationKey: ["feedbucket", "submissions", "ai-create-ticket"],
    mutationFn: (submissionId: number) =>
      apiClient.post<{ ticketId: number; ticketType: FeedbucketAiTicketType }>(
        `/feedbucket/submissions/${submissionId}/ai-create-ticket`,
      ),
    onSuccess: (_, submissionId) => {
      void qc.invalidateQueries({ queryKey: growthAndSignQueryKeys.feedbucket.submission(submissionId) });
      void qc.invalidateQueries({ queryKey: growthAndSignQueryKeys.feedbucket.all });
    },
  });
}
