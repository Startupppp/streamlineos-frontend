"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  LeadScoreResult, EmailTone, GeneratedEmail, DealPredictionResult,
  NextActionResult, ChurnRiskResult, ConversationSummaryResult, LeadEnrichmentResult,
} from "@/lib/ai/prompts";

/* ─── AI Lead Scoring ─────────────────────────────────────────────────────── */

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

/* ─── AI Email Generator ──────────────────────────────────────────────────── */

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

/* ─── AI Deal Prediction ──────────────────────────────────────────────────── */

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

/* ─── AI Next-Best-Action ─────────────────────────────────────────────────── */

export function useNextBestAction() {
  return useMutation({
    mutationFn: (leadId: number) =>
      apiClient.post<NextActionResult>("/ai/next-action", { leadId }),
  });
}

/* ─── AI Churn Risk Analysis ──────────────────────────────────────────────── */

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

/* ─── AI Conversation Summary ─────────────────────────────────────────────── */

export function useSummarizeConversation() {
  return useMutation({
    mutationFn: (input: { activityType: string; subject?: string; notes: string; leadName?: string; dealName?: string }) =>
      apiClient.post<ConversationSummaryResult>("/ai/summarize", input),
  });
}

/* ─── AI Lead Enrichment ──────────────────────────────────────────────────── */

export function useEnrichLead() {
  return useMutation({
    mutationFn: (input: { name: string; company?: string; email?: string; designation?: string; city?: string }) =>
      apiClient.post<LeadEnrichmentResult>("/ai/enrich-lead", input),
  });
}
