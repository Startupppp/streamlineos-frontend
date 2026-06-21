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

export interface AiScoreBreakdown {
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

export interface BulkRejectResult {
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

export interface RecruitmentFunnelStage {
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

export function useCandidates(params?: { status?: string; jobId?: number }) {
  return useQuery({
    queryKey: queryKeys.hr.candidates(params as Record<string, unknown> | undefined),
    queryFn: () =>
      apiClient.get<Candidate[]>("/hr/recruitment/candidates", params as Record<string, unknown> | undefined),
    staleTime: 2 * 60_000,
  });
}

export function useCandidate(id: number) {
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
    enabled: !!id,
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

export function useRecruitmentPipeline() {
  return useQuery({
    queryKey: queryKeys.hr.recruitmentPipeline(),
    queryFn: () =>
      apiClient.get<Record<string, Candidate[]>>("/hr/recruitment/pipeline"),
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
