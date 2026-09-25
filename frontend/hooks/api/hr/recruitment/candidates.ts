"use client";

import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import type { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";

const noContentC = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);
const candidateErasureC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/candidates-schema").then((m) => m.candidateErasureContract),
);
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
import type { RejectionDetails } from "@/hooks/api/hr/recruitment/rejection-reasons-schema";
import type { CandidateSlaRecord, InterviewScorecard } from "./interviews";
import type { candidateDetailSchema, CandidateErasureResult } from "@/hooks/api/hr/recruitment/candidates-schema";
import { useGatedQuery } from "@/hooks/api/gated-query";

export type CandidateDetail = z.infer<typeof candidateDetailSchema>;

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
  cursor?: string;
  limit?: number;
};

export type CandidatesListResponse = {
  data: Candidate[];
  pagination: { limit: number; hasMore: boolean; nextCursor: string | null };
  statusCounts?: Record<string, number>;
};

function candidateQueryParams(params: CandidatesParams | undefined, limit: number) {
  const queryParams: Record<string, unknown> = { limit };
  if (params?.cursor) queryParams.cursor = params.cursor;
  if (params?.status) queryParams.status = params.status;
  if (params?.source) queryParams.source = params.source;
  if (params?.jobId) queryParams.jobId = params.jobId;
  if (params?.search?.trim()) queryParams.search = params.search.trim();
  return queryParams;
}

/**
 * The endpoint is keyset-paginated, so this reads the first page only. Every
 * consumer here wants a bounded picker list, not a walk of the whole pipeline —
 * `useCandidatesPage` is what pages.
 */
export function useCandidates(params?: CandidatesParams) {
  const queryParams = candidateQueryParams(params, params?.limit ?? 100);

  return useGatedQuery("hr:requisitions:view", {
    queryKey: humanResourcesQueryKeys.hr.candidates(queryParams),
    queryFn: async ({ signal }): Promise<Candidate[]> => {
      const res = await apiClient.get<CandidatesListResponse>(
        "/hr/recruitment/candidates",
        queryParams,
        signal,
        candidateListContract,
      );
      return res.data;
    },
    staleTime: 2 * 60_000,
  });
}

/** Full keyset page (includes statusCounts for filter chips). */
export function useCandidatesPage(params?: CandidatesParams) {
  const queryParams = candidateQueryParams(params, params?.limit ?? 20);

  return useGatedQuery("hr:requisitions:view", {
    queryKey: [...humanResourcesQueryKeys.hr.candidates(queryParams), "page"] as const,
    queryFn: ({ signal }): Promise<CandidatesListResponse> =>
      apiClient.get<CandidatesListResponse>(
        "/hr/recruitment/candidates",
        queryParams,
        signal,
        candidateListContract,
      ),
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
  return useGatedQuery("hr:requisitions:view", {
    queryKey: [...humanResourcesQueryKeys.hr.all, "candidateDuplicates"] as const,
    queryFn: ({ signal }) =>
      apiClient.get<DuplicateCandidateGroup[]>(
        "/hr/recruitment/candidates/duplicates",
        undefined,
        signal,
        candidateDuplicatesContract,
      ),
    staleTime: 60_000,
  });
}

export function useLinkDuplicateCandidate() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:requisitions:manage", {
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
  return useAuthorizedMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "recruitment", "candidates", "bulk-shortlist"],
    mutationFn: (candidateIds: number[]) =>
      apiClient.post<{ shortlisted: number; skipped: number }>("/hr/recruitment/candidates/bulk-shortlist", { candidateIds }, undefined, bulkShortlistContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.candidates() });
      void qc.invalidateQueries({ queryKey: ATS_KANBAN_KEY });
    },
  });
}

export function useCandidate(candidateId: number) {
  const canView = useCan("hr:requisitions:view");
  const enabled = canView && Number.isFinite(candidateId) && candidateId > 0;
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.candidate(candidateId),
    queryFn: ({ signal }) =>
      apiClient.get<CandidateDetail>(
        `/hr/recruitment/candidates/${candidateId}`,
        undefined,
        signal,
        candidateDetailContract,
      ),
    staleTime: 2 * 60_000,
    enabled,
  });
}

export function useGenerateCandidateAiScore() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:requisitions:manage", {
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
  return useAuthorizedMutation("hr:requisitions:manage", {
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
  return useAuthorizedMutation("hr:requisitions:manage", {
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
  return useAuthorizedMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "recruitment", "candidates", "update"],
    mutationFn: ({ candidateId, ...data }: UpdateCandidateInput & { candidateId: number }) =>
      apiClient.patch<{ success: boolean }>(`/hr/recruitment/candidates/${candidateId}`, data, undefined, candidateSuccessContract),
    onSuccess: (_, { candidateId }) => {
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.candidates() });
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.candidate(candidateId) });
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.recruitmentPipeline() });
    },
  });
}

export function useDeleteCandidate() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "recruitment", "candidates", "delete"],
    mutationFn: (candidateId: number) =>
      apiClient.delete<void>(`/hr/recruitment/candidates/${candidateId}`, undefined, undefined, noContentC),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.candidates() });
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.recruitmentStats() });
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.recruitmentPipeline() });
    },
  });
}

/**
 * Erase a candidate's personal data, résumé vault included.
 *
 * Deliberately separate from `useDeleteCandidate`, which hits a 204 route and
 * therefore cannot report anything. This one returns what was and was not
 * deleted, because the résumé objects live in a store the API does not own and
 * "we tried" is a different claim from "it is gone". Callers must branch on
 * `status` rather than treating a resolved promise as success.
 */
export function useEraseCandidate() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "recruitment", "candidates", "erase"],
    mutationFn: (candidateId: number) =>
      apiClient.delete<CandidateErasureResult>(
        `/hr/recruitment/candidates/${candidateId}/personal-data`,
        undefined,
        undefined,
        candidateErasureC,
      ),
    onSuccess: (_result, candidateId) => {
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.candidate(candidateId) });
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.candidates() });
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.recruitmentStats() });
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.recruitmentPipeline() });
    },
  });
}

export function useCreateApplication() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:requisitions:manage", {
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
  const canRequisitions = useCan("hr:requisitions:view");
  return useQuery({
    queryKey: ATS_KANBAN_KEY,
    queryFn: ({ signal }) => apiClient.get<AtsPipelineResponse>("/hr/recruitment/pipeline", undefined, signal, pipelineContract),
    staleTime: 2 * 60_000,
    enabled: canRequisitions,
  });
}

export function useUpdateCandidateStage() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "recruitment", "candidates", "update-stage"],
    /*
      The disposition rides with the stage. The endpoint refuses a move to
      REJECTED that carries no reason, so a caller that omits it gets a 422
      rather than a silent reject — which is why every reject control routes
      through `RejectCandidateDialog` before reaching here.
    */
    mutationFn: ({
      candidateId,
      ...body
    }: { candidateId: number; stage: CandidateStatus } & Partial<RejectionDetails>) =>
      apiClient.patch<{ id: number; stage: CandidateStatus; changed: boolean }>(
        `/hr/recruitment/candidates/${candidateId}/stage`,
        body,
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
                // `shown` is what this column renders; it moves with the cards,
                // or the board's "N of M" would drift from the list beneath it.
                shown: withoutCandidate.length,
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
                  shown: withoutCandidate.length + 1,
                }
              : { ...s, candidates: withoutCandidate, shown: withoutCandidate.length };
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
  return useAuthorizedMutation("hr:requisitions:manage", {
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
  const canViewRequisitions = useCan("hr:requisitions:view");
  return useQuery({
    queryKey: [...humanResourcesQueryKeys.hr.all, "recruitmentAnalytics"] as const,
    queryFn: ({ signal }) => apiClient.get<RecruitmentAnalytics>("/hr/recruitment/analytics", undefined, signal, recruitmentAnalyticsContract),
    staleTime: 2 * 60_000,
    enabled: canViewRequisitions,
    // Backend declares GET /hr/recruitment/analytics twice; the windowed handler
    // (from/to required) wins and 400s this unwindowed read. Kept inline so the
    // 400 cannot take the command center and analytics pages to the error boundary.
    ...INLINE_READ_ERROR,
  });
}
