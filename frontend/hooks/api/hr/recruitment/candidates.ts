"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan } from "@/hooks/api/access";
import type {
  Candidate,
  CandidateApplication,
  CandidateStatus,
  AtsPipelineResponse,
  CreateCandidateInput,
  UpdateCandidateInput,
  Interview,
} from "@/types/hr";
import type { CandidateSlaRecord, InterviewScorecard } from "./interviews";
import {
  normalizeRecruitmentList,
  unwrapRecruitmentItems,
  type RecruitmentListResponse,
} from "./list-response";
import { useGatedQuery } from "@/hooks/api/gated-query";

const candidateListContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/candidates-schema").then(
    (m) => m.candidateListResponseSchema,
  ),
);
const candidateDuplicatesContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/candidates-schema").then(
    (m) => m.candidateDuplicateGroupListSchema,
  ),
);
const candidateSuccessContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/candidates-schema").then(
    (m) => m.candidateSuccessSchema,
  ),
);
const bulkShortlistContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/candidates-schema").then(
    (m) => m.candidateBulkShortlistResponseSchema,
  ),
);
const candidateDetailContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/candidates-schema").then(
    (m) => m.candidateDetailSchema,
  ),
);
const aiScoreContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/candidates-schema").then(
    (m) => m.aiScoreResultSchema,
  ),
);
const compositeScoreContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/candidates-schema").then(
    (m) => m.compositeScoreResultSchema,
  ),
);
const candidateCreateContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/candidates-schema").then(
    (m) => m.candidateSchema,
  ),
);
const jobApplicationContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/candidates-schema").then(
    (m) => m.jobApplicationResponseSchema,
  ),
);
const pipelineContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/candidates-schema").then(
    (m) => m.pipelineResponseSchema,
  ),
);
const moveStageContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/candidates-schema").then(
    (m) => m.candidateMoveStageResponseSchema,
  ),
);
const bulkRejectContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/candidates-schema").then(
    (m) => m.candidateBulkRejectResponseSchema,
  ),
);
const recruitmentAnalyticsContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/candidates-schema").then(
    (m) => m.recruitmentAnalyticsSchema,
  ),
);

interface AiScoreBreakdown {
  technicalSkills: number;
  experience: number;
  communication: number;
  cultureFit: number;
  leadership: number;
}

export interface AiScoreResult {
  overall: number;
  breakdown: AiScoreBreakdown;
  summary: string;
}

export type CompositeVerdict = "STRONG_HIRE" | "HIRE" | "ON_FENCE" | "NO_HIRE";

export interface RoundSummary {
  interviewType: string;
  scheduledAt: string;
  recommendation: string;
  overallRating: number | null;
  keyNotes: string;
}

export interface CompositeScoreResult {
  verdict: CompositeVerdict;
  overall: number;
  reasoning: string;
  strengthsAcrossRounds: string[];
  concernsAcrossRounds: string[];
  roundSummaries: RoundSummary[];
}

export interface BulkRejectInput {
  candidateIds: number[];
  sendRejectionEmail?: boolean;
}

interface BulkRejectResult {
  rejected: number;
  alreadyRejected: number;
  emailsSent: number;
}

interface RecruitmentFunnelStage {
  stage: string;
  count: number;
  avgDaysInStage: number | null;
}

export interface RecruitmentAnalytics {
  funnel: RecruitmentFunnelStage[];
  hireRate: number;
  totalCandidates: number;
  totalHired: number;
}

const ATS_KANBAN_KEY = humanResourcesQueryKeys.hr.atsKanban();

export type CandidatesParams = {
  status?: string;
  source?: string;
  jobId?: number;
  /** Server-side search (first/last name, email, company) */
  search?: string;
  page?: number;
  pageSize?: number;
};

export type CandidatesListResponse = RecruitmentListResponse<Candidate> & {
  statusCounts?: Record<string, number>;
};

/**
 * Backend returns `{ items, total, page, pageSize, totalPages, statusCounts? }`.
 * Hook normalizes to Candidate[] so existing list UIs keep working.
 */
export function useCandidates(params?: CandidatesParams) {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 100;
  const queryParams: Record<string, unknown> = {
    page,
    pageSize,
  };
  if (params?.status) queryParams.status = params.status;
  if (params?.source) queryParams.source = params.source;
  if (params?.jobId) queryParams.jobId = params.jobId;
  if (params?.search?.trim()) queryParams.search = params.search.trim();

  return useGatedQuery("hr:employees:view", {
    queryKey: humanResourcesQueryKeys.hr.candidates(queryParams),
    queryFn: async ({ signal }): Promise<Candidate[]> => {
      const res = await apiClient.get<Candidate[] | CandidatesListResponse>(
        "/hr/recruitment/candidates",
        queryParams,
        signal,
        candidateListContract,
      );
      return unwrapRecruitmentItems(res);
    },
    staleTime: 2 * 60_000,
  });
}

/** Full paginated candidates payload (includes statusCounts for filter chips). */
export function useCandidatesPage(params?: CandidatesParams) {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 20;
  const queryParams: Record<string, unknown> = { page, pageSize };
  if (params?.status) queryParams.status = params.status;
  if (params?.source) queryParams.source = params.source;
  if (params?.jobId) queryParams.jobId = params.jobId;
  if (params?.search?.trim()) queryParams.search = params.search.trim();

  return useGatedQuery("hr:employees:view", {
    queryKey: [...humanResourcesQueryKeys.hr.candidates(queryParams), "page"] as const,
    queryFn: async ({ signal }): Promise<CandidatesListResponse> => {
      const res = await apiClient.get<Candidate[] | CandidatesListResponse>(
        "/hr/recruitment/candidates",
        queryParams,
        signal,
        candidateListContract,
      );
      const base = normalizeRecruitmentList(res, pageSize);
      const statusCounts =
        res && typeof res === "object" && !Array.isArray(res) && "statusCounts" in res
          ? (res as CandidatesListResponse).statusCounts
          : undefined;
      return { ...base, statusCounts };
    },
    staleTime: 2 * 60_000,
  });
}

export interface DuplicateCandidateGroup {
  key: string;
  candidates: Array<{
    id: number;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    status: CandidateStatus;
    createdAt: string;
    duplicateOfId: number | null;
  }>;
}

export function useCandidateDuplicates() {
  return useGatedQuery("hr:employees:view", {
    queryKey: [...humanResourcesQueryKeys.hr.all, "candidateDuplicates"] as const,
    queryFn: ({ signal }) => apiClient.get<DuplicateCandidateGroup[]>("/hr/recruitment/candidates/duplicates", undefined, signal),
    staleTime: 60_000,
  });
}

export function useLinkDuplicateCandidate() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:employees:manage", {
    mutationKey: ["hr", "recruitment", "candidates", "link-duplicate"],
    mutationFn: ({ candidateId, duplicateOfId }: { candidateId: number; duplicateOfId: number }) =>
      apiClient.post<{ success: boolean }>(`/hr/recruitment/candidates/${candidateId}/link-duplicate`, { duplicateOfId }, undefined, candidateSuccessContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.candidates() });
      void qc.invalidateQueries({ queryKey: [...humanResourcesQueryKeys.hr.all, "candidateDuplicates"] });
    },
  });
}

export function useBulkShortlistCandidates() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:employees:manage", {
    mutationKey: ["hr", "recruitment", "candidates", "bulk-shortlist"],
    mutationFn: (candidateIds: number[]) =>
      apiClient.post<{ shortlisted: number; skipped: number }>("/hr/recruitment/candidates/bulk-shortlist", { candidateIds }, undefined, bulkShortlistContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.candidates() });
      void qc.invalidateQueries({ queryKey: ATS_KANBAN_KEY });
    },
  });
}

export function useCandidate(id: number) {
  const canView = useCan("hr:employees:view");
  const enabled = canView && Number.isFinite(id) && id > 0;
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.candidate(id),
    queryFn: ({ signal }) =>
      apiClient.get<
        Candidate & {
          applications?: CandidateApplication[];
          slaTracking?: CandidateSlaRecord[];
          interviews?: (Interview & { scorecards?: InterviewScorecard[] })[];
        }
      >(`/hr/recruitment/candidates/${id}`, undefined, signal),
    staleTime: 2 * 60_000,
    enabled,
  });
}

export function useGenerateCandidateAiScore() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:employees:manage", {
    mutationKey: ["hr", "recruitment", "candidates", "ai-score"],
    mutationFn: (candidateId: number) =>
      apiClient.post<AiScoreResult>(
        `/hr/recruitment/candidates/${candidateId}/ai-score`,
        {},
        undefined,
        aiScoreContract,
      ),
    onSuccess: (_, candidateId) => {
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.candidate(candidateId) });
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.candidates() });
    },
  });
}

export function useGenerateCandidateCompositeScore() {
  return useAuthorizedMutation("hr:employees:manage", {
    mutationKey: ["hr", "recruitment", "candidates", "composite-score"],
    mutationFn: (candidateId: number) =>
      apiClient.post<CompositeScoreResult>(
        `/hr/recruitment/candidates/${candidateId}/composite-score`,
        {},
        undefined,
        compositeScoreContract,
      ),
  });
}

export function useCreateCandidate() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:employees:manage", {
    mutationKey: ["hr", "recruitment", "candidates", "create"],
    mutationFn: (data: CreateCandidateInput) =>
      apiClient.post<Candidate>("/hr/recruitment/candidates", data, undefined, candidateCreateContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.candidates() });
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.recruitmentStats() });
    },
  });
}

export function useUpdateCandidate() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:employees:manage", {
    mutationKey: ["hr", "recruitment", "candidates", "update"],
    mutationFn: ({ id, ...data }: UpdateCandidateInput & { id: number }) =>
      apiClient.patch<{ success: boolean }>(`/hr/recruitment/candidates/${id}`, data, undefined, candidateSuccessContract),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.candidates() });
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.candidate(id) });
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.recruitmentPipeline() });
    },
  });
}

export function useDeleteCandidate() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:employees:manage", {
    mutationKey: ["hr", "recruitment", "candidates", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/recruitment/candidates/${id}`, undefined, undefined, candidateSuccessContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.candidates() });
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.recruitmentStats() });
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.recruitmentPipeline() });
    },
  });
}

export function useCreateApplication() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:employees:manage", {
    mutationKey: ["hr", "recruitment", "applications", "create"],
    mutationFn: ({ candidateId, ...data }: { candidateId: number; jobPostingId: number; coverLetter?: string }) =>
      apiClient.post<CandidateApplication>(
        `/hr/recruitment/candidates/${candidateId}/applications`,
        data,
        undefined,
        jobApplicationContract,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.candidates() });
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.jobPostings() });
    },
  });
}

export function useAtsKanban() {
  const canEmployees = useCan("hr:employees:view");
  return useQuery({
    queryKey: ATS_KANBAN_KEY,
    queryFn: ({ signal }) => apiClient.get<AtsPipelineResponse>("/hr/recruitment/pipeline", undefined, signal, pipelineContract),
    staleTime: 2 * 60_000,
    enabled: canEmployees,
  });
}

export function useUpdateCandidateStage() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:employees:manage", {
    mutationKey: ["hr", "recruitment", "candidates", "update-stage"],
    mutationFn: ({ candidateId, stage }: { candidateId: number; stage: CandidateStatus }) =>
      apiClient.patch<{ id: number; stage: CandidateStatus; changed: boolean }>(
        `/hr/recruitment/candidates/${candidateId}/stage`,
        { stage },
        undefined,
        moveStageContract,
      ),
    onMutate: async ({ candidateId, stage }) => {
      await qc.cancelQueries({ queryKey: ATS_KANBAN_KEY });
      const previous = qc.getQueryData<AtsPipelineResponse>(ATS_KANBAN_KEY);

      if (previous) {
        const next: AtsPipelineResponse = {
          stages: previous.stages.map((s) => {
            const hadCandidate = s.candidates.some((c) => c.id === candidateId);
            const withoutCandidate = s.candidates.filter((c) => c.id !== candidateId);
            if (s.stage !== stage) {
              return {
                ...s,
                candidates: withoutCandidate,
                total: hadCandidate ? Math.max(0, s.total - 1) : s.total,
              };
            }
            const moved = previous.stages
              .flatMap((st) => st.candidates)
              .find((c) => c.id === candidateId);
            return moved
              ? {
                  ...s,
                  candidates: [moved, ...withoutCandidate],
                  total: hadCandidate ? s.total : s.total + 1,
                }
              : { ...s, candidates: withoutCandidate };
          }),
        };
        qc.setQueryData<AtsPipelineResponse>(ATS_KANBAN_KEY, next);
      }

      return { previous };
    },
    onError: (_, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(ATS_KANBAN_KEY, context.previous);
      }
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ATS_KANBAN_KEY });
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.recruitmentPipeline() });
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.recruitmentStats() });
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.candidates() });
    },
  });
}

export function useBulkRejectCandidates() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:employees:manage", {
    mutationKey: ["hr", "recruitment", "candidates", "bulk-reject"],
    mutationFn: (data: BulkRejectInput) =>
      apiClient.post<BulkRejectResult>(
        "/hr/recruitment/candidates/bulk-reject",
        data,
        undefined,
        bulkRejectContract,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.candidates() });
      void qc.invalidateQueries({ queryKey: ATS_KANBAN_KEY });
    },
  });
}

export function useRecruitmentAnalytics() {
  const canInterviews = useCan("hr:interviews:view");
  return useQuery({
    queryKey: [...humanResourcesQueryKeys.hr.all, "recruitmentAnalytics"] as const,
    queryFn: ({ signal }) => apiClient.get<RecruitmentAnalytics>("/hr/recruitment/analytics", undefined, signal, recruitmentAnalyticsContract),
    staleTime: 2 * 60_000,
    enabled: canInterviews,
  });
}
