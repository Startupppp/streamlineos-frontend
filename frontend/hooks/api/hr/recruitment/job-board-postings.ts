"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const jobBoardPostingsListC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/job-board-postings-schema").then((m) => m.jobBoardPostingsListContract),
);
const createJobBoardPostingC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/job-board-postings-schema").then((m) => m.createJobBoardPostingContract),
);
const updateJobBoardPostingC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/job-board-postings-schema").then((m) => m.updateJobBoardPostingContract),
);
const deleteJobBoardPostingC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/job-board-postings-schema").then((m) => m.deleteJobBoardPostingContract),
);

export type JobBoardPostingStatus = "DRAFT" | "POSTED" | "EXPIRED" | "CLOSED";

export interface JobBoardPosting {
  id: number;
  orgId: string;
  jobPostingId: number;
  platform: string;
  externalPostUrl?: string | null;
  status: JobBoardPostingStatus;
  postedBy?: string | null;
  postedAt?: string | null;
  expiryDate?: string | null;
  spend?: string | null;
  applicantCount: number;
  qualifiedCount: number;
  hiredCount: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateJobBoardPostingInput {
  platform: string;
  externalPostUrl?: string | null;
  status?: JobBoardPostingStatus;
  postedAt?: string;
  expiryDate?: string;
  spend?: number;
  notes?: string;
}

export interface UpdateJobBoardPostingInput {
  externalPostUrl?: string | null;
  status?: JobBoardPostingStatus;
  postedAt?: string;
  expiryDate?: string;
  spend?: number;
  applicantCount?: number;
  qualifiedCount?: number;
  hiredCount?: number;
  notes?: string;
}

const jobBoardPostingsKey = (jobId: number) => ["hr", "jobBoardPostings", jobId] as const;

export function useJobBoardPostings(jobId: number) {
  return useGatedQuery("hr:employees:view", {
    queryKey: jobBoardPostingsKey(jobId),
    queryFn: ({ signal }) => apiClient.get<JobBoardPosting[]>(`/hr/recruitment/jobs/${jobId}/board-postings`, undefined, signal, jobBoardPostingsListC),
    staleTime: 60_000,
    enabled: !!jobId,
  });
}

export function useCreateJobBoardPosting(jobId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:employees:manage", {
    mutationKey: ["hr", "jobBoardPostings", "create", jobId],
    mutationFn: (data: CreateJobBoardPostingInput) =>
      apiClient.post<JobBoardPosting>(`/hr/recruitment/jobs/${jobId}/board-postings`, data, undefined, createJobBoardPostingC),
    onSuccess: () => qc.invalidateQueries({ queryKey: jobBoardPostingsKey(jobId) }),
  });
}

export function useUpdateJobBoardPosting(jobId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:employees:manage", {
    mutationKey: ["hr", "jobBoardPostings", "update", jobId],
    mutationFn: ({ id, ...data }: UpdateJobBoardPostingInput & { id: number }) =>
      apiClient.patch<JobBoardPosting>(`/hr/recruitment/jobs/${jobId}/board-postings/${id}`, data, undefined, updateJobBoardPostingC),
    onSuccess: () => qc.invalidateQueries({ queryKey: jobBoardPostingsKey(jobId) }),
  });
}

export function useDeleteJobBoardPosting(jobId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:employees:manage", {
    mutationKey: ["hr", "jobBoardPostings", "delete", jobId],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/recruitment/jobs/${jobId}/board-postings/${id}`, undefined, undefined, deleteJobBoardPostingC),
    onSuccess: () => qc.invalidateQueries({ queryKey: jobBoardPostingsKey(jobId) }),
  });
}
