"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { assignedInterviewsQueryOptions } from "./recruitment-read-options";

const ASSIGNED_INTERVIEWS_PAGE_SIZE = 20;

export interface AssignedInterview {
  id: number;
  type: string;
  scheduledAt: string;
  duration: number;
  location: string | null;
  meetingLink: string | null;
  result: "PENDING" | "PASSED" | "FAILED" | "NO_SHOW";
  candidateFirstName: string;
  candidateLastName: string;
  jobTitle: string | null;
  scorecardSubmittedAt: string | null;
}

interface AssignedInterviewsResponse {
  items: AssignedInterview[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const assignedInterviewsC = lazyContract(() =>
  import("@/hooks/api/employee-self-service/recruitment-schema").then((m) => m.assignedInterviewsResponseContract),
);
const interviewScorecardC = lazyContract(() =>
  import("@/hooks/api/employee-self-service/recruitment-schema").then((m) => m.interviewScorecardResponseContract),
);

const recruitmentKey = ["employee-self-service", "recruitment"] as const;

export function useAssignedInterviews(page: number) {
  return useGatedQuery("self:recruitment", {
    ...assignedInterviewsQueryOptions(page),
    queryFn: ({ signal }: { signal?: AbortSignal }) =>
      apiClient.get<AssignedInterviewsResponse>("/me/recruitment", {
        page,
        pageSize: ASSIGNED_INTERVIEWS_PAGE_SIZE,
      }, signal, assignedInterviewsC),
  });
}

export function useSubmitAssignedInterviewScorecard(interviewId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("self:recruitment", {
    mutationKey: [...recruitmentKey, interviewId, "scorecard"],
    mutationFn: (body: {
      ratings: Record<string, number>;
      recommendation: "HIRE" | "NO_HIRE" | "MAYBE";
      notes?: string;
    }) =>
      apiClient.post(`/me/recruitment/${interviewId}/scorecard`, body, undefined, interviewScorecardC),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: recruitmentKey });
    },
  });
}
