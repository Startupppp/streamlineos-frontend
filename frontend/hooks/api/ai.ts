"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useAccess } from "@/hooks/api/access";
import type {
  LeadScoreResult, EmailTone, GeneratedEmail, DealPredictionResult,
  NextActionResult, LeadEnrichmentResult,
  CandidateScoreResult, ReviewDraftResult, AttritionRiskResult,
  InterviewKitResult, InterviewNotesSummaryResult,
} from "@/lib/ai/schemas";

export function useAIScoreLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["a", "i", "score", "lead"],
    mutationFn: (leadId: number) =>
      apiClient.post<LeadScoreResult>("/ai/score-lead", { leadId }),
    onSuccess: (_, leadId) => {
      qc.invalidateQueries({ queryKey: queryKeys.leads.detail(leadId) });
      qc.invalidateQueries({ queryKey: queryKeys.leads.all });
    },
  });
}

export function useAIBatchScoreLeads() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["a", "i", "batch", "score", "leads"],
    mutationFn: (leadIds: number[]) =>
      apiClient.post<{ results: Record<number, LeadScoreResult>; scored: number }>(
        "/ai/score-lead",
        { leadIds },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.leads.all });
    },
  });
}

interface GenerateEmailInput {
  leadName: string;
  company?: string;
  designation?: string;
  dealStage?: string;
  lastActivityType?: string;
  lastActivityDate?: string;
  lastActivityNotes?: string;
  potentialValue?: string;
  tone?: EmailTone;
  context?: string;
}

export function useGenerateEmail() {
  return useMutation({
    mutationKey: ["generate", "email"],
    mutationFn: (input: GenerateEmailInput) =>
      apiClient.post<GeneratedEmail>("/ai/generate-email", input),
  });
}

export function usePredictDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["predict", "deal"],
    mutationFn: (dealId: number) =>
      apiClient.post<DealPredictionResult>("/ai/predict-deal", { dealId }),
    onSuccess: (_, dealId) => {
      qc.invalidateQueries({ queryKey: queryKeys.deals.detail(dealId) });
      qc.invalidateQueries({ queryKey: queryKeys.deals.all });
    },
  });
}

export function useNextBestAction() {
  return useMutation({
    mutationKey: ["next", "best", "action"],
    mutationFn: (leadId: number) =>
      apiClient.post<NextActionResult>("/ai/next-action", { leadId }),
  });
}

export function useEnrichLead() {
  return useMutation({
    mutationKey: ["enrich", "lead"],
    mutationFn: (input: { name: string; company?: string; email?: string; designation?: string; city?: string }) =>
      apiClient.post<LeadEnrichmentResult>("/ai/enrich-lead", input),
  });
}

export function useAIScoreCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["a", "i", "score", "candidate"],
    mutationFn: (input: { candidateId: number; jobId?: number }) =>
      apiClient.post<CandidateScoreResult>("/ai/score-candidate", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.candidates() });
    },
  });
}

export function useAIGenerateReview() {
  return useMutation({
    mutationKey: ["a", "i", "generate", "review"],
    mutationFn: (input: { userId: string; periodStart: string; periodEnd: string }) =>
      apiClient.post<ReviewDraftResult>("/ai/generate-review", input),
  });
}

export function useAIAttritionRisk() {
  return useMutation({
    mutationKey: ["a", "i", "attrition", "risk"],
    mutationFn: (userId: string) =>
      apiClient.post<AttritionRiskResult>("/ai/attrition-risk", { userId }),
  });
}

export interface NLSearchLead {
  id: number;
  name: string;
  email: string | null;
  company: string | null;
  status: string;
  priority: string | null;
  source: string | null;
  value: number | null;
  city: string | null;
  assignedTo: string | null;
}

export interface NLSearchResult {
  query: string;
  parsedFilters: Record<string, unknown>;
  leads: NLSearchLead[];
  total: number;
}

export function useNLSearch() {
  return useMutation({
    mutationKey: ["n", "l", "search"],
    mutationFn: (query: string) =>
      apiClient.post<NLSearchResult>("/ai/nl-search", { query }),
  });
}

interface GenerateJdInput {
  title: string;
  requirements?: string;
  location?: string;
  type?: string;
  salaryMin?: number;
  salaryMax?: number;
}

export function useGenerateJobDescription() {
  return useMutation({
    mutationKey: ["generate", "job", "description"],
    mutationFn: (input: GenerateJdInput) =>
      apiClient.post<{ description: string }>("/ai/generate-jd", input),
  });
}

export interface OrgFeatureFlags {
  aiChat: boolean;
  aiLeadScoring: boolean;
  aiEmailDraft: boolean;
  aiSmartNotifications: boolean;
  aiWeeklyRecap: boolean;
  supportAi: boolean;
}

export function useOrgFeatureFlags() {
  return useQuery({
    queryKey: queryKeys.settings.featureFlags(),
    queryFn: ({ signal }) => apiClient.get<OrgFeatureFlags>("/settings/feature-flags", undefined, signal),
    staleTime: 30_000,
  });
}

export function useUpdateFeatureFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["update", "feature", "flag"],
    mutationFn: (data: { flag: keyof OrgFeatureFlags; enabled: boolean }) =>
      apiClient.patch<{ success: boolean; flag: string; enabled: boolean }>(
        "/settings/feature-flags",
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.settings.featureFlags() });
    },
  });
}

interface AiUsageTotals {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd: string;
  requestCount: number;
}

interface AiUsageByFeature {
  feature: string;
  model: string;
  totalTokens: number;
  estimatedCostUsd: string;
  requestCount: number;
}

interface AiUsageDaily {
  date: string;
  totalTokens: number;
  estimatedCostUsd: string;
  requestCount: number;
}

export interface AiUsageData {
  totals: AiUsageTotals;
  byFeature: AiUsageByFeature[];
  daily: AiUsageDaily[];
}

export function useAiUsage() {
  const { data: access } = useAccess();
  const canView = Boolean(access?.isOrgOwner);
  return useQuery({
    queryKey: queryKeys.settings.aiUsage(),
    queryFn: ({ signal }) => apiClient.get<AiUsageData>("/settings/ai-usage", undefined, signal),
    enabled: canView,
    staleTime: 5 * 60_000,
  });
}

export function useAIInterviewKit() {
  return useMutation({
    mutationKey: ["ai", "hr", "interview-kit"],
    mutationFn: (jobPostingId: number) =>
      apiClient.post<InterviewKitResult>("/ai/hr/interview-kit", { jobPostingId }),
  });
}

export function useAIInterviewNotesSummary() {
  return useMutation({
    mutationKey: ["ai", "hr", "interview-notes-summary"],
    mutationFn: (input: { candidateId: number; jobPostingId?: number }) =>
      apiClient.post<InterviewNotesSummaryResult>("/ai/hr/interview-notes-summary", input),
  });
}

export function useAcceptCandidateScore() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["ai", "hr", "accept-candidate-score"],
    mutationFn: (input: { candidateId: number; aiScore: number }) =>
      apiClient.post<{ accepted: boolean }>("/ai/hr/accept-candidate-score", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.candidates() });
    },
  });
}
