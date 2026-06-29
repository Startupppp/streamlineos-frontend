"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

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
  return useQuery({
    queryKey: queryKeys.hr.recruiters(),
    queryFn: () => apiClient.get<RecruiterSummary[]>("/hr/recruitment/recruiters"),
    staleTime: 2 * 60_000,
  });
}

export function useRecruiterActivity(params?: { recruiterId?: string; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.hr.recruiterActivity(params),
    queryFn: () => {
      const sp = new URLSearchParams();
      if (params?.recruiterId) sp.set("recruiterId", params.recruiterId);
      if (params?.limit) sp.set("limit", String(params.limit));
      return apiClient.get<RecruiterActivityEntry[]>(`/hr/recruitment/recruiters/activity?${sp.toString()}`);
    },
    staleTime: 60_000,
  });
}

export function useLogRecruiterActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      action: RecruiterActivityAction;
      candidateId?: number;
      jobPostingId?: number;
      notes?: string;
    }) => apiClient.post("/hr/recruitment/recruiters/activity", data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.hr.recruiterActivity() });
      void qc.invalidateQueries({ queryKey: queryKeys.hr.recruiters() });
    },
  });
}
