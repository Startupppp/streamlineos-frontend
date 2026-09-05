"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";

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

const recruitmentKey = ["employee-self-service", "recruitment"] as const;

export function useAssignedInterviews(page: number) {
  return useGatedQuery("self:recruitment", {
    queryKey: humanResourcesQueryKeys.hr.hrAssignedInterviews(page),
    queryFn: ({ signal }) =>
      apiClient.get<AssignedInterviewsResponse>("/me/recruitment", {
        page,
        pageSize: 20,
      }, signal),
    staleTime: 60_000,
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
      apiClient.post(`/me/recruitment/${interviewId}/scorecard`, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: recruitmentKey });
    },
  });
}
