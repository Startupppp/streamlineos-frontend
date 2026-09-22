"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { growthAndSignQueryKeys } from "@/lib/query-keys/growth-and-sign";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import type { FeedbucketAiAnalysis, FeedbucketAiTicketType } from "@/types/feedbucket";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const feedbucketFeedbackAnalysisC = lazyContract(() =>
  import("@/hooks/api/feedbucket/feedbucket-schema").then((m) => m.feedbucketFeedbackAnalysisContract),
);
const feedbucketCreateTicketFromAnalysisC = lazyContract(() =>
  import("@/hooks/api/feedbucket/feedbucket-schema").then((m) => m.feedbucketCreateTicketFromAnalysisContract),
);

export function useAnalyzeFeedbucketSubmission() {
  const qc = useQueryClient();
  return useAuthorizedMutation("feedbucket:submissions:ai", {
    mutationKey: ["feedbucket", "submissions", "ai-analyze"],
    mutationFn: ({ submissionId, force }: { submissionId: number; force?: boolean }) =>
      apiClient.post<FeedbucketAiAnalysis>(
        `/feedbucket/submissions/${submissionId}/ai-analyze`,
        { force: force ?? false }, undefined, feedbucketFeedbackAnalysisC,
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
    mutationFn: ({ submissionId, projectId, assigneeId }: { submissionId: number; projectId?: number; assigneeId?: string }) =>
      apiClient.post<{ ticketId: number; ticketType: FeedbucketAiTicketType }>(
        `/feedbucket/submissions/${submissionId}/ai-create-ticket`,
        projectId !== undefined || assigneeId !== undefined ? { projectId, assigneeId } : undefined,
        undefined, feedbucketCreateTicketFromAnalysisC,
      ),
    onSuccess: (_, { submissionId }) => {
      void qc.invalidateQueries({ queryKey: growthAndSignQueryKeys.feedbucket.submission(submissionId) });
      void qc.invalidateQueries({ queryKey: growthAndSignQueryKeys.feedbucket.all });
      void qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.tickets() });
    },
  });
}
