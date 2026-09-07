"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { customerWorkQueryKeys } from "@/lib/query-keys/customer-work";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { platformHierarchyQueryKeys } from "@/lib/query-keys/platform-hierarchy";
import { useCan } from "@/hooks/api/access";
import type {
  LeadScoreResult, EmailTone, GeneratedEmail, DealPredictionResult,
  NextActionResult, LeadEnrichmentResult,
  CandidateScoreResult, ReviewDraftResult, AttritionRiskResult,
  InterviewKitResult, InterviewNotesSummaryResult,
} from "@/lib/ai/schemas";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import {
  readAiAbortableScalar,
  type AiAbortInput,
  type AiAbortableScalar,
} from "@/hooks/api/ai-abort";
import { streamAiText, type AiTextStreamResult } from "@/hooks/api/ai-text-stream";
import { useGatedQuery } from "@/hooks/api/gated-query";

const scoreLeadSingleContract = lazyContract(() =>
  import("@/hooks/api/ai-schema").then((m) => m.scoreLeadSingleContract),
);
const scoreLeadBatchContract = lazyContract(() =>
  import("@/hooks/api/ai-schema").then((m) => m.scoreLeadBatchContract),
);
const generateEmailContract = lazyContract(() =>
  import("@/hooks/api/ai-schema").then((m) => m.generateEmailContract),
);
const predictDealContract = lazyContract(() =>
  import("@/hooks/api/ai-schema").then((m) => m.predictDealContract),
);
const nextActionContract = lazyContract(() =>
  import("@/hooks/api/ai-schema").then((m) => m.nextActionContract),
);
const enrichLeadContract = lazyContract(() =>
  import("@/hooks/api/ai-schema").then((m) => m.enrichLeadContract),
);
const scoreCandidateContract = lazyContract(() =>
  import("@/hooks/api/ai-schema").then((m) => m.scoreCandidateContract),
);
const generateReviewContract = lazyContract(() =>
  import("@/hooks/api/ai-schema").then((m) => m.generateReviewContract),
);
const attritionRiskContract = lazyContract(() =>
  import("@/hooks/api/ai-schema").then((m) => m.attritionRiskContract),
);
const nlSearchContract = lazyContract(() =>
  import("@/hooks/api/ai-schema").then((m) => m.nlSearchContract),
);
const orgFeatureFlagsContract = lazyContract(() =>
  import("@/hooks/api/ai-schema").then((m) => m.orgFeatureFlagsContract),
);
const updateFeatureFlagContract = lazyContract(() =>
  import("@/hooks/api/ai-schema").then((m) => m.updateFeatureFlagContract),
);
const aiUsageContract = lazyContract(() =>
  import("@/hooks/api/ai-schema").then((m) => m.aiUsageContract),
);
const interviewKitContract = lazyContract(() =>
  import("@/hooks/api/ai-schema").then((m) => m.interviewKitContract),
);
const interviewNotesSummaryContract = lazyContract(() =>
  import("@/hooks/api/ai-schema").then((m) => m.interviewNotesSummaryContract),
);
const acceptCandidateScoreContract = lazyContract(() =>
  import("@/hooks/api/ai-schema").then((m) => m.acceptCandidateScoreContract),
);

export function useAIScoreLead() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:ai:use", {
    mutationKey: ["a", "i", "score", "lead"],
    mutationFn: (input: AiAbortableScalar<number>) => {
      const { value: leadId, signal } = readAiAbortableScalar(input);
      return apiClient.post<LeadScoreResult>("/ai/score-lead", { leadId }, { signal }, scoreLeadSingleContract);
    },
    onSuccess: (_, input) => {
      const { value: leadId } = readAiAbortableScalar(input);
      qc.invalidateQueries({ queryKey: customerWorkQueryKeys.leads.detail(leadId) });
      qc.invalidateQueries({ queryKey: customerWorkQueryKeys.leads.all });
    },
  });
}

export function useAIBatchScoreLeads() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:ai:use", {
    mutationKey: ["a", "i", "batch", "score", "leads"],
    mutationFn: (leadIds: number[]) =>
      apiClient.post<{ results: Record<number, LeadScoreResult>; scored: number }>(
        "/ai/score-lead",
        { leadIds },
        undefined,
        scoreLeadBatchContract,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerWorkQueryKeys.leads.all });
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
  return useAuthorizedMutation("crm:ai:use", {
    mutationKey: ["generate", "email"],
    mutationFn: ({ signal, ...input }: GenerateEmailInput & AiAbortInput) =>
      apiClient.post<GeneratedEmail>("/ai/generate-email", input, { signal }, generateEmailContract),
  });
}

export function usePredictDeal() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:ai:use", {
    mutationKey: ["predict", "deal"],
    mutationFn: ({ dealId, signal }: { dealId: number } & AiAbortInput) =>
      apiClient.post<DealPredictionResult>("/ai/predict-deal", { dealId }, { signal }, predictDealContract),
    onSuccess: (_, { dealId }) => {
      qc.invalidateQueries({ queryKey: customerWorkQueryKeys.deals.detail(dealId) });
      qc.invalidateQueries({ queryKey: customerWorkQueryKeys.deals.all });
    },
  });
}

export function useNextBestAction() {
  return useAuthorizedMutation("crm:ai:use", {
    mutationKey: ["next", "best", "action"],
    mutationFn: ({ leadId, signal }: { leadId: number } & AiAbortInput) =>
      apiClient.post<NextActionResult>("/ai/next-action", { leadId }, { signal }, nextActionContract),
  });
}

export function useEnrichLead() {
  return useAuthorizedMutation("crm:ai:use", {
    mutationKey: ["enrich", "lead"],
    mutationFn: ({
      signal,
      ...input
    }: { name: string; company?: string; email?: string; designation?: string; city?: string } & AiAbortInput) =>
      apiClient.post<LeadEnrichmentResult>("/ai/enrich-lead", input, { signal }, enrichLeadContract),
  });
}

export function useAIScoreCandidate() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:interviews:manage", {
    mutationKey: ["a", "i", "score", "candidate"],
    mutationFn: ({
      signal,
      ...input
    }: { candidateId: number; jobId?: number } & AiAbortInput) =>
      apiClient.post<CandidateScoreResult>("/ai/score-candidate", input, { signal }, scoreCandidateContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.candidates() });
    },
  });
}

export function useAIGenerateReview() {
  return useAuthorizedMutation("hr:performance:manage", {
    mutationKey: ["a", "i", "generate", "review"],
    mutationFn: ({
      signal,
      ...input
    }: { userId: string; periodStart: string; periodEnd: string } & AiAbortInput) =>
      apiClient.post<ReviewDraftResult>("/ai/generate-review", input, { signal }, generateReviewContract),
  });
}

export function useAIAttritionRisk() {
  return useAuthorizedMutation("hr:employees:manage", {
    mutationKey: ["a", "i", "attrition", "risk"],
    mutationFn: (input: AiAbortableScalar<string>) => {
      const { value: userId, signal } = readAiAbortableScalar(input);
      return apiClient.post<AttritionRiskResult>("/ai/attrition-risk", { userId }, { signal }, attritionRiskContract);
    },
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
  return useAuthorizedMutation("crm:ai:use", {
    mutationKey: ["n", "l", "search"],
    mutationFn: (input: AiAbortableScalar<string>) => {
      const { value: query, signal } = readAiAbortableScalar(input);
      return apiClient.post<NLSearchResult>("/ai/nl-search", { query }, { signal }, nlSearchContract);
    },
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

/**
 * Streams. `POST /ai/generate-jd/stream` takes the same body and the same permission as the
 * buffered route, so the only thing the buffered call bought was a blank pane until the whole
 * draft existed. `signal` and `onToken` are stripped from the body by the rest spread — a
 * serialised AbortSignal is the trap `ai-mutation-signal.test.tsx` guards.
 */
export function useGenerateJobDescription() {
  return useAuthorizedMutation<
    AiTextStreamResult,
    Error,
    GenerateJdInput & AiAbortInput & { onToken?: (token: string) => void }
  >("hr:interviews:manage", {
    mutationKey: ["generate", "job", "description"],
    mutationFn: ({ signal, onToken, ...input }) =>
      streamAiText({ path: "/ai/generate-jd/stream", body: input, onToken, signal }),
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
  return useGatedQuery("settings:view", {
    queryKey: platformHierarchyQueryKeys.settings.featureFlags(),
    queryFn: ({ signal }) => apiClient.get<OrgFeatureFlags>("/settings/feature-flags", undefined, signal, orgFeatureFlagsContract),
    staleTime: 30_000,
  });
}

export function useUpdateFeatureFlag() {
  const qc = useQueryClient();
  return useAuthorizedMutation("settings:manage", {
    mutationKey: ["update", "feature", "flag"],
    mutationFn: (data: { flag: keyof OrgFeatureFlags; enabled: boolean }) =>
      apiClient.patch<{ success: boolean; flag: string; enabled: boolean }>(
        "/settings/feature-flags",
        data,
        undefined,
        updateFeatureFlagContract,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: platformHierarchyQueryKeys.settings.featureFlags() });
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
  const canView = useCan("ai:usage:view");
  return useQuery({
    queryKey: platformHierarchyQueryKeys.settings.aiUsage(),
    queryFn: ({ signal }) => apiClient.get<AiUsageData>("/settings/ai-usage", undefined, signal, aiUsageContract),
    enabled: canView,
    staleTime: 5 * 60_000,
  });
}

export function useAIInterviewKit() {
  return useAuthorizedMutation("hr:interviews:manage", {
    mutationKey: ["ai", "hr", "interview-kit"],
    mutationFn: ({ jobPostingId, signal }: { jobPostingId: number } & AiAbortInput) =>
      apiClient.post<InterviewKitResult>(
        "/ai/hr/interview-kit",
        { jobPostingId },
        { signal },
        interviewKitContract,
      ),
  });
}

export function useAIInterviewNotesSummary() {
  return useAuthorizedMutation("hr:interviews:manage", {
    mutationKey: ["ai", "hr", "interview-notes-summary"],
    mutationFn: ({
      signal,
      ...input
    }: { candidateId: number; jobPostingId?: number } & AiAbortInput) =>
      apiClient.post<InterviewNotesSummaryResult>(
        "/ai/hr/interview-notes-summary",
        input,
        { signal },
        interviewNotesSummaryContract,
      ),
  });
}

export function useAcceptCandidateScore() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:interviews:manage", {
    mutationKey: ["ai", "hr", "accept-candidate-score"],
    mutationFn: (input: { candidateId: number; aiScore: number }) =>
      apiClient.post<{ accepted: boolean }>("/ai/hr/accept-candidate-score", input, undefined, acceptCandidateScoreContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.candidates() });
    },
  });
}
