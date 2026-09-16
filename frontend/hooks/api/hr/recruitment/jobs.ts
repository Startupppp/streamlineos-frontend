"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";

const noContentC = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type {
  JobPosting,
  RecruitmentStats,
  CreateJobPostingInput,
  UpdateJobPostingInput,
} from "@/types/hr";
import { useGatedQuery } from "@/hooks/api/gated-query";

interface JobPostingsPage {
  items: JobPosting[];
  total: number;
  pagination: { limit: number; nextCursor: string | null; hasMore: boolean };
}

const recruitmentStatsC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/jobs-schema").then((m) => m.recruitmentStatsContract),
);
const jobPostingsPageC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/jobs-schema").then((m) => m.jobPostingsPageContract),
);
const createJobPostingC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/jobs-schema").then((m) => m.createJobPostingContract),
);
const updateJobPostingC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/jobs-schema").then((m) => m.updateJobPostingContract),
);
const duplicateJobPostingC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/jobs-schema").then((m) => m.duplicateJobPostingContract),
);
const jobPostingDetailC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/jobs-schema").then((m) => m.jobPostingDetailContract),
);
const publishJobC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/jobs-schema").then((m) => m.publishJobContract),
);
const sourcePortalsListC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/jobs-schema").then((m) => m.sourcePortalsListContract),
);
const upsertSourcePortalC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/jobs-schema").then((m) => m.upsertSourcePortalContract),
);
const jobShareLinksC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/jobs-schema").then((m) => m.jobShareLinksContract),
);

export type JobBoardPlatform = "LINKEDIN" | "NAUKRI" | "INDEED";


interface PublishResult {
  platform: string;
  status: string;
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
  const canInterviews = useCan("hr:interviews:view");
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.recruitmentStats(),
    queryFn: ({ signal }) => apiClient.get<RecruitmentStats>("/hr/recruitment/stats", undefined, signal, recruitmentStatsC),
    staleTime: 2 * 60_000,
    enabled: canInterviews,
  });
}

export type JobPostingsParams = {
  status?: string;
  cursor?: string;
  pageSize?: number;
};

/**
 * Backend returns `{ items, total, pagination }`.
 * Hooks normalize to a flat JobPosting[] so list UIs keep working.
 */
export function useJobPostings(params?: JobPostingsParams) {
  const canEmployees = useCan("hr:employees:view");
  const pageSize = params?.pageSize ?? 100;
  const queryParams = {
    ...(params?.status ? { status: params.status } : {}),
    ...(params?.cursor ? { cursor: params.cursor } : {}),
    pageSize,
  };
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.jobPostings(queryParams),
    queryFn: async ({ signal }): Promise<JobPosting[]> => {
      const res = await apiClient.get<JobPostingsPage>(
        "/hr/recruitment/jobs",
        queryParams,
        signal,
        jobPostingsPageC,
      );
      return res.items;
    },
    staleTime: 2 * 60_000,
    enabled: canEmployees,
  });
}

/** Full paginated jobs payload when totals/pagination UI is needed. */
export function useJobPostingsPage(params?: JobPostingsParams) {
  const pageSize = params?.pageSize ?? 20;
  const queryParams = {
    ...(params?.status ? { status: params.status } : {}),
    ...(params?.cursor ? { cursor: params.cursor } : {}),
    pageSize,
  };
  return useGatedQuery("hr:employees:view", {
    queryKey: [...humanResourcesQueryKeys.hr.jobPostings(queryParams), "page"] as const,
    queryFn: ({ signal }): Promise<JobPostingsPage> => {
      return apiClient.get<JobPostingsPage>(
        "/hr/recruitment/jobs",
        queryParams,
        signal,
        jobPostingsPageC,
      );
    },
    staleTime: 2 * 60_000,
  });
}

export function useJobPosting(jobId: number) {
  const enabled = Number.isFinite(jobId) && jobId > 0;
  return useGatedQuery("hr:employees:view", {
    queryKey: humanResourcesQueryKeys.hr.jobPosting(jobId),
    queryFn: ({ signal }) =>
      apiClient.get<JobPosting>(`/hr/recruitment/jobs/${jobId}`, undefined, signal, jobPostingDetailC),
    staleTime: 2 * 60_000,
    enabled,
  });
}

const JOB_POSTINGS_ROOT = [...humanResourcesQueryKeys.hr.all, "jobPostings"] as const;

export function useCreateJobPosting() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:employees:manage", {
    mutationKey: ["hr", "recruitment", "jobs", "create"],
    mutationFn: (data: CreateJobPostingInput) =>
      apiClient.post<JobPosting>("/hr/recruitment/jobs", data, undefined, createJobPostingC),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: JOB_POSTINGS_ROOT });
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.recruitmentStats() });
    },
  });
}

export function useUpdateJobPosting() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:employees:manage", {
    mutationKey: ["hr", "recruitment", "jobs", "update"],
    mutationFn: ({ jobId, ...data }: UpdateJobPostingInput & { jobId: number }) =>
      apiClient.patch<{ success: boolean }>(`/hr/recruitment/jobs/${jobId}`, data, undefined, updateJobPostingC),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: JOB_POSTINGS_ROOT });
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.jobPosting(vars.jobId) });
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.recruitmentStats() });
    },
  });
}

export function useDeleteJobPosting() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:employees:manage", {
    mutationKey: ["hr", "recruitment", "jobs", "delete"],
    mutationFn: (jobId: number) =>
      apiClient.delete<void>(`/hr/recruitment/jobs/${jobId}`, undefined, undefined, noContentC),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: JOB_POSTINGS_ROOT });
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.recruitmentStats() });
    },
  });
}

export function useDuplicateJobPosting() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:employees:manage", {
    mutationKey: ["hr", "recruitment", "jobs", "duplicate"],
    mutationFn: (jobId: number) =>
      apiClient.post<JobPosting>(`/hr/recruitment/jobs/${jobId}/duplicate`, {}, undefined, duplicateJobPostingC),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: JOB_POSTINGS_ROOT });
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.recruitmentStats() });
    },
  });
}

export function usePublishJobToBoards() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:employees:manage", {
    mutationKey: ["hr", "recruitment", "jobs", "publish"],
    mutationFn: ({ jobId, platforms }: { jobId: number; platforms: JobBoardPlatform[] }) =>
      apiClient.post<PublishJobResult>(`/hr/recruitment/jobs/${jobId}/publish`, { platforms }, undefined, publishJobC),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: JOB_POSTINGS_ROOT });
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.jobPosting(vars.jobId) });
    },
  });
}

export function useSourcePortals() {
  return useGatedQuery("hr:employees:manage", {
    queryKey: [...humanResourcesQueryKeys.hr.all, "sourcePortals"] as const,
    queryFn: ({ signal }) => apiClient.get<SourcePortal[]>("/hr/recruitment/portals", undefined, signal, sourcePortalsListC),
    staleTime: 2 * 60_000,
  });
}

export function useUpsertSourcePortal() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:employees:manage", {
    mutationKey: ["hr", "recruitment", "portals", "upsert"],
    mutationFn: (data: UpsertPortalInput) =>
      apiClient.post<SourcePortal>("/hr/recruitment/portals", data, undefined, upsertSourcePortalC),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: [...humanResourcesQueryKeys.hr.all, "sourcePortals"] as const }),
  });
}

export function useJobShareLinks(jobId: number) {
  return useGatedQuery("hr:employees:view", {
    queryKey: [...humanResourcesQueryKeys.hr.all, "jobShare", jobId] as const,
    queryFn: ({ signal }) =>
      apiClient.get<JobShareLinks>(`/hr/recruitment/jobs/${jobId}/share`, undefined, signal, jobShareLinksC),
    staleTime: 2 * 60_000,
    enabled: jobId > 0,
  });
}
