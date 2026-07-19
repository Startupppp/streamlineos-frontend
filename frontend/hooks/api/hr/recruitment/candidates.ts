"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
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

export interface SourceEffectivenessRow {
  source: string;
  total: number;
  hired: number;
  rejected: number;
  hireRate: number;
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

const ATS_KANBAN_KEY = queryKeys.hr.atsKanban();

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

  return useQuery({
    queryKey: queryKeys.hr.candidates(queryParams),
    queryFn: async (): Promise<Candidate[]> => {
      const res = await apiClient.get<Candidate[] | CandidatesListResponse>(
        "/hr/recruitment/candidates",
        queryParams,
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

  return useQuery({
    queryKey: [...queryKeys.hr.candidates(queryParams), "page"] as const,
    queryFn: async (): Promise<CandidatesListResponse> => {
      const res = await apiClient.get<Candidate[] | CandidatesListResponse>(
        "/hr/recruitment/candidates",
        queryParams,
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
  return useQuery({
    queryKey: [...queryKeys.hr.all, "candidateDuplicates"] as const,
    queryFn: () => apiClient.get<DuplicateCandidateGroup[]>("/hr/recruitment/candidates/duplicates"),
    staleTime: 60_000,
  });
}

export function useLinkDuplicateCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ candidateId, duplicateOfId }: { candidateId: number; duplicateOfId: number }) =>
      apiClient.post<{ success: boolean }>(`/hr/recruitment/candidates/${candidateId}/link-duplicate`, { duplicateOfId }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.hr.candidates() });
      void qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "candidateDuplicates"] });
    },
  });
}

export function useUnlinkDuplicateCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (candidateId: number) =>
      apiClient.post<{ success: boolean }>(`/hr/recruitment/candidates/${candidateId}/unlink-duplicate`, {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.hr.candidates() });
      void qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "candidateDuplicates"] });
    },
  });
}

export function useBulkShortlistCandidates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (candidateIds: number[]) =>
      apiClient.post<{ shortlisted: number; skipped: number }>("/hr/recruitment/candidates/bulk-shortlist", { candidateIds }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.hr.candidates() });
      void qc.invalidateQueries({ queryKey: ATS_KANBAN_KEY });
    },
  });
}

export function useCandidate(id: number) {
  const enabled = Number.isFinite(id) && id > 0;
  return useQuery({
    queryKey: queryKeys.hr.candidate(id),
    queryFn: () =>
      apiClient.get<
        Candidate & {
          applications?: CandidateApplication[];
          slaTracking?: CandidateSlaRecord[];
          interviews?: (Interview & { scorecards?: InterviewScorecard[] })[];
        }
      >(`/hr/recruitment/candidates/${id}`),
    staleTime: 2 * 60_000,
    enabled,
  });
}

export function useGenerateCandidateAiScore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (candidateId: number) =>
      apiClient.post<AiScoreResult>(
        `/hr/recruitment/candidates/${candidateId}/ai-score`,
        {}
      ),
    onSuccess: (_data, candidateId) => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.candidate(candidateId) });
      qc.invalidateQueries({ queryKey: queryKeys.hr.candidates() });
    },
  });
}

export function useGenerateCandidateCompositeScore() {
  return useMutation({
    mutationFn: (candidateId: number) =>
      apiClient.post<CompositeScoreResult>(
        `/hr/recruitment/candidates/${candidateId}/composite-score`,
        {}
      ),
  });
}

export function useCreateCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCandidateInput) =>
      apiClient.post<Candidate>("/hr/recruitment/candidates", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.candidates() });
      qc.invalidateQueries({ queryKey: queryKeys.hr.recruitmentStats() });
    },
  });
}

export function useUpdateCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateCandidateInput & { id: number }) =>
      apiClient.patch<{ success: boolean }>(`/hr/recruitment/candidates/${id}`, data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.candidates() });
      qc.invalidateQueries({ queryKey: queryKeys.hr.candidate(id) });
      qc.invalidateQueries({ queryKey: queryKeys.hr.recruitmentPipeline() });
    },
  });
}

export function useDeleteCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/recruitment/candidates/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.candidates() });
      qc.invalidateQueries({ queryKey: queryKeys.hr.recruitmentStats() });
      qc.invalidateQueries({ queryKey: queryKeys.hr.recruitmentPipeline() });
    },
  });
}

export function useCreateApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ candidateId, ...data }: { candidateId: number; jobPostingId: number; coverLetter?: string }) =>
      apiClient.post<CandidateApplication>(
        `/hr/recruitment/candidates/${candidateId}/applications`,
        data
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.candidates() });
      qc.invalidateQueries({ queryKey: queryKeys.hr.jobPostings() });
    },
  });
}

/** @deprecated Prefer useAtsKanban — pipeline returns { stages }, not a stage map. */
export function useRecruitmentPipeline() {
  return useQuery({
    queryKey: queryKeys.hr.recruitmentPipeline(),
    queryFn: () => apiClient.get<AtsPipelineResponse>("/hr/recruitment/pipeline"),
    staleTime: 2 * 60_000,
  });
}

export function useAtsKanban() {
  return useQuery({
    queryKey: ATS_KANBAN_KEY,
    queryFn: () => apiClient.get<AtsPipelineResponse>("/hr/recruitment/pipeline"),
    staleTime: 2 * 60_000,
  });
}

export function useUpdateCandidateStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ candidateId, stage }: { candidateId: number; stage: CandidateStatus }) =>
      apiClient.patch<{ id: number; stage: CandidateStatus; changed: boolean }>(
        `/hr/recruitment/candidates/${candidateId}/stage`,
        { stage }
      ),
    onMutate: async ({ candidateId, stage }) => {
      await qc.cancelQueries({ queryKey: ATS_KANBAN_KEY });
      const previous = qc.getQueryData<AtsPipelineResponse>(ATS_KANBAN_KEY);

      if (previous) {
        const next: AtsPipelineResponse = {
          stages: previous.stages.map((s) => {
            const withoutCandidate = s.candidates.filter((c) => c.id !== candidateId);
            if (s.stage !== stage) return { ...s, candidates: withoutCandidate };
            const moved = previous.stages
              .flatMap((st) => st.candidates)
              .find((c) => c.id === candidateId);
            return moved
              ? { ...s, candidates: [moved, ...withoutCandidate] }
              : { ...s, candidates: withoutCandidate };
          }),
        };
        qc.setQueryData<AtsPipelineResponse>(ATS_KANBAN_KEY, next);
      }

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(ATS_KANBAN_KEY, context.previous);
      }
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ATS_KANBAN_KEY });
      void qc.invalidateQueries({ queryKey: queryKeys.hr.recruitmentPipeline() });
      void qc.invalidateQueries({ queryKey: queryKeys.hr.recruitmentStats() });
      void qc.invalidateQueries({ queryKey: queryKeys.hr.candidates() });
    },
  });
}

export function useBulkRejectCandidates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BulkRejectInput) =>
      apiClient.post<BulkRejectResult>(
        "/hr/recruitment/candidates/bulk-reject",
        data
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.hr.candidates() });
      void qc.invalidateQueries({ queryKey: ATS_KANBAN_KEY });
    },
  });
}

export function useSourceEffectiveness() {
  return useQuery({
    queryKey: [...queryKeys.hr.all, "sourceEffectiveness"] as const,
    queryFn: () => apiClient.get<SourceEffectivenessRow[]>("/reports/source-effectiveness"),
    staleTime: 2 * 60_000,
  });
}

export function useRecruitmentAnalytics() {
  return useQuery({
    queryKey: [...queryKeys.hr.all, "recruitmentAnalytics"] as const,
    queryFn: () => apiClient.get<RecruitmentAnalytics>("/hr/recruitment/analytics"),
    staleTime: 2 * 60_000,
  });
}
