"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  LeadScoreResult, EmailTone, GeneratedEmail, DealPredictionResult,
  NextActionResult, ChurnRiskResult, ConversationSummaryResult, LeadEnrichmentResult,
  CandidateScoreResult, ReviewDraftResult, HelpdeskReplyResult, AttritionRiskResult,
} from "@/lib/ai/prompts";

export function useAIScoreLead() {
  const qc = useQueryClient();
  return useMutation({
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
  allVariations?: boolean;
}

export function useGenerateEmail() {
  return useMutation({
    mutationFn: (input: GenerateEmailInput) =>
      apiClient.post<GeneratedEmail>("/ai/generate-email", input),
  });
}

export function useGenerateEmailVariations() {
  return useMutation({
    mutationFn: (input: Omit<GenerateEmailInput, "tone">) =>
      apiClient.post<{ variations: Record<EmailTone, GeneratedEmail> }>(
        "/ai/generate-email",
        { ...input, allVariations: true },
      ),
  });
}

export function usePredictDeal() {
  const qc = useQueryClient();
  return useMutation({
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
    mutationFn: (leadId: number) =>
      apiClient.post<NextActionResult>("/ai/next-action", { leadId }),
  });
}

export function useAnalyzeChurnRisk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { clientId: number; openTickets?: number; ticketsLast90Days?: number; daysSinceLastActivity?: number | null }) =>
      apiClient.post<ChurnRiskResult>("/ai/churn-risk", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clients.all });
    },
  });
}

export function useSummarizeConversation() {
  return useMutation({
    mutationFn: (input: { activityType: string; subject?: string; notes: string; leadName?: string; dealName?: string }) =>
      apiClient.post<ConversationSummaryResult>("/ai/summarize", input),
  });
}

export function useEnrichLead() {
  return useMutation({
    mutationFn: (input: { name: string; company?: string; email?: string; designation?: string; city?: string }) =>
      apiClient.post<LeadEnrichmentResult>("/ai/enrich-lead", input),
  });
}

export function useAIScoreCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { candidateId: number; jobId?: number }) =>
      apiClient.post<CandidateScoreResult>("/ai/score-candidate", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.candidates() });
    },
  });
}

export function useAIGenerateReview() {
  return useMutation({
    mutationFn: (input: { userId: string; periodStart: string; periodEnd: string }) =>
      apiClient.post<ReviewDraftResult>("/ai/generate-review", input),
  });
}

export function useAISuggestHelpdeskReply() {
  return useMutation({
    mutationFn: (ticketId: number) =>
      apiClient.post<HelpdeskReplyResult>("/ai/helpdesk-reply", { ticketId }),
  });
}

export function useAIAttritionRisk() {
  return useMutation({
    mutationFn: (userId: string) =>
      apiClient.post<AttritionRiskResult>("/ai/attrition-risk", { userId }),
  });
}
