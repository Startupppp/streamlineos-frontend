"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export type JobBoardPostingStatus = "DRAFT" | "POSTED" | "EXPIRED" | "CLOSED";

export interface JobBoardPosting {
  id: number;
  orgId: string;
  jobPostingId: number;
  platform: string;
  externalPostUrl?: string;
  status: JobBoardPostingStatus;
  postedBy?: string;
  postedAt?: string;
  expiryDate?: string;
  spend?: string;
  applicantCount: number;
  qualifiedCount: number;
  hiredCount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateJobBoardPostingInput {
  platform: string;
  externalPostUrl?: string;
  status?: JobBoardPostingStatus;
  postedAt?: string;
  expiryDate?: string;
  spend?: number;
  notes?: string;
}

export interface UpdateJobBoardPostingInput {
  externalPostUrl?: string;
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
  return useQuery({
    queryKey: jobBoardPostingsKey(jobId),
    queryFn: ({ signal }) => apiClient.get<JobBoardPosting[]>(`/hr/recruitment/jobs/${jobId}/board-postings`, undefined, signal),
    staleTime: 60_000,
    enabled: !!jobId,
  });
}

export function useCreateJobBoardPosting(jobId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "jobBoardPostings", "create", jobId],
    mutationFn: (data: CreateJobBoardPostingInput) =>
      apiClient.post<JobBoardPosting>(`/hr/recruitment/jobs/${jobId}/board-postings`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: jobBoardPostingsKey(jobId) }),
  });
}

export function useUpdateJobBoardPosting(jobId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "jobBoardPostings", "update", jobId],
    mutationFn: ({ id, ...data }: UpdateJobBoardPostingInput & { id: number }) =>
      apiClient.patch<JobBoardPosting>(`/hr/recruitment/jobs/${jobId}/board-postings/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: jobBoardPostingsKey(jobId) }),
  });
}

export function useDeleteJobBoardPosting(jobId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "jobBoardPostings", "delete", jobId],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/recruitment/jobs/${jobId}/board-postings/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: jobBoardPostingsKey(jobId) }),
  });
}
