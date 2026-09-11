"use client";

import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useGatedQuery } from "@/hooks/api/gated-query";

const recruitersListC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/recruiters-schema").then((m) => m.recruitersListContract),
);
const recruiterActivityListC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/recruiters-schema").then((m) => m.recruiterActivityListContract),
);

type RecruiterActivityAction =
  | "CALL_MADE"
  | "EMAIL_SENT"
  | "CANDIDATE_ADDED"
  | "NOTE_ADDED"
  | "INTERVIEW_SCHEDULED";

export interface RecruiterSummary {
  userId: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role?: string;
  assignedJobsCount: number;
  activitySummary: Record<string, number>;
}

export interface RecruiterActivityEntry {
  id: number;
  recruiterId: string;
  action: string;
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
    queryKey: humanResourcesQueryKeys.hr.recruiters(),
    queryFn: ({ signal }) => apiClient.get<RecruiterSummary[]>("/hr/recruitment/recruiters", undefined, signal, recruitersListC),
    staleTime: 2 * 60_000,
  });
}

export function useRecruiterActivity(params?: { recruiterId?: string; limit?: number }) {
  return useGatedQuery("hr:employees:view", {
    queryKey: humanResourcesQueryKeys.hr.recruiterActivity(params),
    queryFn: ({ signal }) => {
      const sp = new URLSearchParams();
      if (params?.recruiterId) sp.set("recruiterId", params.recruiterId);
      if (params?.limit) sp.set("limit", String(params.limit));
      return apiClient.get<RecruiterActivityEntry[]>(`/hr/recruitment/recruiters/activity?${sp.toString()}`, undefined, signal, recruiterActivityListC);
    },
    staleTime: 60_000,
  });
}

