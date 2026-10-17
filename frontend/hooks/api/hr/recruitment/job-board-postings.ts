"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";

const noContentC = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);
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
/**
 * The first four are what a recruiter may set by hand on a posting they are
 * tracking themselves. The last four are written by the distribution pipeline
 * and are not settable from the UI — `LIVE` in particular means a board
 * returned a posting id, which only the outbox consumer can establish.
 */
export type JobBoardPostingStatus =
  | "DRAFT"
  | "POSTED"
  | "EXPIRED"
  | "CLOSED"
  | "BLOCKED"
  | "QUEUED"
  | "FAILED"
  | "LIVE";

/** Statuses a person may choose. Never includes one a vendor has to grant. */
export const SETTABLE_POSTING_STATUSES: readonly JobBoardPostingStatus[] = [
  "DRAFT",
  "POSTED",
  "EXPIRED",
  "CLOSED",
];

export interface JobBoardPosting {
  id: number;
  orgId: string;
  jobPostingId: number;
  platform: string;
  externalPostUrl?: string | null;
  externalPostingId?: string | null;
  status: JobBoardPostingStatus;
  statusDetail?: string | null;
  lastAttemptAt?: string | null;
  lastSyncedAt?: string | null;
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
  return useGatedQuery("hr:requisitions:view", {
    queryKey: jobBoardPostingsKey(jobId),
    queryFn: ({ signal }) => apiClient.get<JobBoardPosting[]>(`/hr/recruitment/jobs/${jobId}/board-postings`, undefined, signal, jobBoardPostingsListC),
    staleTime: 60_000,
    enabled: !!jobId,
  });
}

export function useCreateJobBoardPosting(jobId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "jobBoardPostings", "create", jobId],
    mutationFn: (data: CreateJobBoardPostingInput) =>
      apiClient.post<JobBoardPosting>(`/hr/recruitment/jobs/${jobId}/board-postings`, data, undefined, createJobBoardPostingC),
    onSuccess: () => qc.invalidateQueries({ queryKey: jobBoardPostingsKey(jobId) }),
  });
}

export function useUpdateJobBoardPosting(jobId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "jobBoardPostings", "update", jobId],
    mutationFn: ({ boardPostingId, ...data }: UpdateJobBoardPostingInput & { boardPostingId: number }) =>
      apiClient.patch<JobBoardPosting>(`/hr/recruitment/jobs/${jobId}/board-postings/${boardPostingId}`, data, undefined, updateJobBoardPostingC),
    onSuccess: () => qc.invalidateQueries({ queryKey: jobBoardPostingsKey(jobId) }),
  });
}

export function useDeleteJobBoardPosting(jobId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "jobBoardPostings", "delete", jobId],
    mutationFn: (boardPostingId: number) =>
      apiClient.delete<void>(`/hr/recruitment/jobs/${jobId}/board-postings/${boardPostingId}`, undefined, undefined, noContentC),
    onSuccess: () => qc.invalidateQueries({ queryKey: jobBoardPostingsKey(jobId) }),
  });
}
