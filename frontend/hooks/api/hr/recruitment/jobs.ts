"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  JobPosting,
  RecruitmentStats,
  CreateJobPostingInput,
  UpdateJobPostingInput,
} from "@/types/hr";
import {
  normalizeRecruitmentList,
  unwrapRecruitmentItems,
  type RecruitmentListResponse,
} from "./list-response";

export type JobBoardPlatform = "LINKEDIN" | "NAUKRI" | "INDEED";

interface SyncResult {
  platform: string;
  status: "SYNC_INITIATED" | string;
  lastSyncedAt: string;
  message: string;
}

interface PublishResult {
  platform: string;
  status: "PUBLISHED" | "NO_INTEGRATION" | "INACTIVE" | "NO_TOKEN";
}

interface PublishJobResult {
  results: PublishResult[];
  publishedCount: number;
  externalIds: Record<string, string>;
}

export interface SourcePortal {
  id: number;
  platform: string;
  isActive: boolean;
  lastSyncedAt: string | null;
  lastSyncCount: number | null;
  createdAt: string | null;
}

export interface UpsertPortalInput {
  platform: "LINKEDIN" | "NAUKRI" | "INDEED" | "ORGANIC";
  isActive?: boolean;
  oauthToken?: string;
  meta?: Record<string, unknown>;
}

export interface JobShareLinks {
  jobId: number;
  title: string;
  directLink: string;
  shareLinks: Array<{
    platform: string;
    name: string;
    url: string;
    utmUrl: string;
  }>;
}

export function useRecruitmentStats() {
  return useQuery({
    queryKey: queryKeys.hr.recruitmentStats(),
    queryFn: () => apiClient.get<RecruitmentStats>("/hr/recruitment/stats"),
    staleTime: 2 * 60_000,
  });
}

export type JobPostingsParams = {
  status?: string;
  page?: number;
  pageSize?: number;
};

/**
 * Backend returns `{ items, total, page, pageSize, totalPages }`.
 * Hooks normalize to a flat JobPosting[] so list UIs keep working.
 */
export function useJobPostings(params?: JobPostingsParams) {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 100;
  const queryParams = {
    ...(params?.status ? { status: params.status } : {}),
    page,
    pageSize,
  };
  return useQuery({
    queryKey: queryKeys.hr.jobPostings(queryParams as Record<string, unknown>),
    queryFn: async (): Promise<JobPosting[]> => {
      const res = await apiClient.get<JobPosting[] | RecruitmentListResponse<JobPosting>>(
        "/hr/recruitment/jobs",
        queryParams,
      );
      return unwrapRecruitmentItems(res);
    },
    staleTime: 2 * 60_000,
  });
}

/** Full paginated jobs payload when totals/pagination UI is needed. */
export function useJobPostingsPage(params?: JobPostingsParams) {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 20;
  const queryParams = {
    ...(params?.status ? { status: params.status } : {}),
    page,
    pageSize,
  };
  return useQuery({
    queryKey: [...queryKeys.hr.jobPostings(queryParams as Record<string, unknown>), "page"] as const,
    queryFn: async (): Promise<RecruitmentListResponse<JobPosting>> => {
      const res = await apiClient.get<JobPosting[] | RecruitmentListResponse<JobPosting>>(
        "/hr/recruitment/jobs",
        queryParams,
      );
      return normalizeRecruitmentList(res, pageSize);
    },
    staleTime: 2 * 60_000,
  });
}

export function useJobPosting(id: number) {
  const enabled = Number.isFinite(id) && id > 0;
  return useQuery({
    queryKey: queryKeys.hr.jobPosting(id),
    queryFn: () => apiClient.get<JobPosting>(`/hr/recruitment/jobs/${id}`),
    staleTime: 2 * 60_000,
    enabled,
  });
}

const JOB_POSTINGS_ROOT = [...queryKeys.hr.all, "jobPostings"] as const;

export function useCreateJobPosting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateJobPostingInput) =>
      apiClient.post<JobPosting>("/hr/recruitment/jobs", data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: JOB_POSTINGS_ROOT });
      void qc.invalidateQueries({ queryKey: queryKeys.hr.recruitmentStats() });
    },
  });
}

export function useUpdateJobPosting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateJobPostingInput & { id: number }) =>
      apiClient.patch<{ success: boolean }>(`/hr/recruitment/jobs/${id}`, data),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: JOB_POSTINGS_ROOT });
      void qc.invalidateQueries({ queryKey: queryKeys.hr.jobPosting(vars.id) });
      void qc.invalidateQueries({ queryKey: queryKeys.hr.recruitmentStats() });
    },
  });
}

export function useDeleteJobPosting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/recruitment/jobs/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: JOB_POSTINGS_ROOT });
      void qc.invalidateQueries({ queryKey: queryKeys.hr.recruitmentStats() });
    },
  });
}

export function useDuplicateJobPosting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.post<JobPosting>(`/hr/recruitment/jobs/${id}/duplicate`, {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: JOB_POSTINGS_ROOT });
      void qc.invalidateQueries({ queryKey: queryKeys.hr.recruitmentStats() });
    },
  });
}

export function useTriggerPortalSync() {
  return useMutation({
    mutationFn: (platform: JobBoardPlatform) =>
      apiClient.post<SyncResult>(`/hr/recruitment/portals/${platform}/sync`, {}),
  });
}

export function usePublishJobToBoards() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, platforms }: { jobId: number; platforms: JobBoardPlatform[] }) =>
      apiClient.post<PublishJobResult>(`/hr/recruitment/jobs/${jobId}/publish`, { platforms }),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: JOB_POSTINGS_ROOT });
      void qc.invalidateQueries({ queryKey: queryKeys.hr.jobPosting(vars.jobId) });
    },
  });
}

export function useSourcePortals() {
  return useQuery({
    queryKey: [...queryKeys.hr.all, "sourcePortals"] as const,
    queryFn: () => apiClient.get<SourcePortal[]>("/hr/recruitment/portals"),
    staleTime: 2 * 60_000,
  });
}

export function useUpsertSourcePortal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpsertPortalInput) =>
      apiClient.post<SourcePortal>("/hr/recruitment/portals", data),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "sourcePortals"] as const }),
  });
}

export function useJobShareLinks(jobId: number) {
  return useQuery({
    queryKey: [...queryKeys.hr.all, "jobShare", jobId] as const,
    queryFn: () =>
      apiClient.get<JobShareLinks>(`/hr/recruitment/jobs/${jobId}/share`),
    staleTime: 2 * 60_000,
    enabled: jobId > 0,
  });
}
