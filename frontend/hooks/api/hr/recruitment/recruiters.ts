"use client";

import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useGatedQuery } from "@/hooks/api/gated-query";

type RecruiterActivityAction =
  | "CALL_MADE"
  | "EMAIL_SENT"
  | "CANDIDATE_ADDED"
  | "NOTE_ADDED"
  | "INTERVIEW_SCHEDULED";

export interface RecruiterSummary {
  userId: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  assignedJobsCount: number;
  activitySummary: Partial<Record<RecruiterActivityAction, number>>;
}

export interface RecruiterActivityEntry {
  id: number;
  recruiterId: string;
  action: RecruiterActivityAction;
  candidateId: number | null;
  jobPostingId: number | null;
  notes: string | null;
  createdAt: string;
  recruiterName: string | null;
  candidateFirstName: string | null;
  candidateLastName: string | null;
  jobTitle: string | null;
}

export function useRecruiters() {
  return useGatedQuery("hr:employees:view", {
    queryKey: queryKeys.hr.recruiters(),
    queryFn: ({ signal }) => apiClient.get<RecruiterSummary[]>("/hr/recruitment/recruiters", undefined, signal),
    staleTime: 2 * 60_000,
  });
}

export function useRecruiterActivity(params?: { recruiterId?: string; limit?: number }) {
  return useGatedQuery("hr:employees:view", {
    queryKey: queryKeys.hr.recruiterActivity(params),
    queryFn: ({ signal }) => {
      const sp = new URLSearchParams();
      if (params?.recruiterId) sp.set("recruiterId", params.recruiterId);
      if (params?.limit) sp.set("limit", String(params.limit));
      return apiClient.get<RecruiterActivityEntry[]>(`/hr/recruitment/recruiters/activity?${sp.toString()}`, undefined, signal);
    },
    staleTime: 60_000,
  });
}

