"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { FeedbucketAiAnalysis, FeedbucketAiTicketType } from "@/types/feedbucket";

export function useAnalyzeFeedbucketSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["feedbucket", "submissions", "ai-analyze"],
    mutationFn: ({ submissionId, force }: { submissionId: number; force?: boolean }) =>
      apiClient.post<FeedbucketAiAnalysis>(
        `/feedbucket/submissions/${submissionId}/ai-analyze`,
        { force: force ?? false },
      ),
    onSuccess: (_, { submissionId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.feedbucket.submission(submissionId) });
    },
  });
}

export function useCreateTicketFromFeedbucketAi() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["feedbucket", "submissions", "ai-create-ticket"],
    mutationFn: (submissionId: number) =>
      apiClient.post<{ ticketId: number; ticketType: FeedbucketAiTicketType }>(
        `/feedbucket/submissions/${submissionId}/ai-create-ticket`,
      ),
    onSuccess: (_, submissionId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.feedbucket.submission(submissionId) });
      void qc.invalidateQueries({ queryKey: queryKeys.feedbucket.all });
    },
  });
}
