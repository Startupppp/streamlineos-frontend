"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  JobPosting,
  Candidate,
  CandidateApplication,
  Interview,
  RecruitmentStats,
  CreateJobPostingInput,
  UpdateJobPostingInput,
  CreateCandidateInput,
  UpdateCandidateInput,
  CreateInterviewInput,
  UpdateInterviewInput,
} from "@/types/hr";

// ─── Stats ───────────────────────────────────────────────────────────────────

export function useRecruitmentStats() {
  return useQuery({
    queryKey: queryKeys.hr.recruitmentStats(),
    queryFn: () => apiClient.get<RecruitmentStats>("/hr/recruitment/stats"),
  });
}

// ─── Job Postings ────────────────────────────────────────────────────────────

export function useJobPostings(params?: { status?: string }) {
  return useQuery({
    queryKey: queryKeys.hr.jobPostings(params as Record<string, unknown> | undefined),
    queryFn: () =>
      apiClient.get<JobPosting[]>("/hr/recruitment/jobs", params as Record<string, unknown> | undefined),
  });
}

export function useJobPosting(id: number) {
  return useQuery({
    queryKey: queryKeys.hr.jobPosting(id),
    queryFn: () => apiClient.get<JobPosting>(`/hr/recruitment/jobs/${id}`),
    enabled: !!id,
  });
}

export function useCreateJobPosting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateJobPostingInput) =>
      apiClient.post<JobPosting>("/hr/recruitment/jobs", data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.jobPostings() }),
  });
}

export function useUpdateJobPosting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateJobPostingInput & { id: number }) =>
      apiClient.patch<{ success: boolean }>(`/hr/recruitment/jobs/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.jobPostings() });
      qc.invalidateQueries({ queryKey: queryKeys.hr.recruitmentStats() });
    },
  });
}

export function useDeleteJobPosting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/recruitment/jobs/${id}`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.jobPostings() }),
  });
}

// ─── Candidates ──────────────────────────────────────────────────────────────

export function useCandidates(params?: { status?: string; jobId?: number }) {
  return useQuery({
    queryKey: queryKeys.hr.candidates(params as Record<string, unknown> | undefined),
    queryFn: () =>
      apiClient.get<Candidate[]>("/hr/recruitment/candidates", params as Record<string, unknown> | undefined),
  });
}

export function useCandidate(id: number) {
  return useQuery({
    queryKey: queryKeys.hr.candidate(id),
    queryFn: () => apiClient.get<Candidate & { applications?: CandidateApplication[]; interviews?: Interview[] }>(
      `/hr/recruitment/candidates/${id}`
    ),
    enabled: !!id,
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.candidates() });
      qc.invalidateQueries({ queryKey: queryKeys.hr.recruitmentPipeline() });
    },
  });
}

// ─── Applications ────────────────────────────────────────────────────────────

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

// ─── Interviews ──────────────────────────────────────────────────────────────

export function useInterviews(params?: { candidateId?: number; upcoming?: boolean }) {
  return useQuery({
    queryKey: queryKeys.hr.interviews(params as Record<string, unknown> | undefined),
    queryFn: () =>
      apiClient.get<Interview[]>("/hr/recruitment/interviews", params as Record<string, unknown> | undefined),
  });
}

export function useCreateInterview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateInterviewInput) =>
      apiClient.post<Interview>("/hr/recruitment/interviews", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.interviews() });
      qc.invalidateQueries({ queryKey: queryKeys.hr.recruitmentStats() });
    },
  });
}

export function useUpdateInterview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateInterviewInput & { id: number }) =>
      apiClient.patch<{ success: boolean }>(`/hr/recruitment/interviews/${id}`, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.interviews() }),
  });
}

export function useDeleteInterview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/recruitment/interviews/${id}`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.interviews() }),
  });
}

// ─── Pipeline ────────────────────────────────────────────────────────────────

export function useRecruitmentPipeline() {
  return useQuery({
    queryKey: queryKeys.hr.recruitmentPipeline(),
    queryFn: () =>
      apiClient.get<Record<string, Candidate[]>>("/hr/recruitment/pipeline"),
  });
}
