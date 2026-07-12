"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

interface LeadSummaryResult {
  summary: string;
  nextBestActions: string[];
  generatedAt: string;
}

interface DealSummaryResult {
  stage: string;
  summary: string;
  risks: string[];
  recommendedPlays: string[];
  stakeholdersGap: string;
  generatedAt: string;
}

interface NextBestActionsResult {
  actions: Array<{
    leadId: number;
    leadName: string;
    action: string;
    urgency: "low" | "medium" | "high" | "critical";
    reasoning: string;
  }>;
}

interface EmailDraftInput {
  entityType: "lead" | "deal";
  entityId: number;
  intent: string;
  tone: "formal" | "friendly" | "urgent";
}

interface EmailDraftResult {
  subject: string;
  body: string;
  generatedAt: string;
}

interface SummarizeNotesResult {
  summary: string;
  actionItems: string[];
  objections: string[];
  sentiment: "positive" | "neutral" | "negative";
}

interface DuplicateSuggestionsResult {
  leadId: number;
  duplicates: Array<{
    leads: Array<{
      id: number;
      name: string;
      email: string | null;
      phone: string | null;
      company: string | null;
      status: string;
    }>;
    matchReason: string[];
    score: number;
  }>;
  aiExplanation: string;
  generatedAt: string;
}

interface ObjectionHelpResult {
  counterArguments: string[];
  talkingPoints: string[];
  suggestedResponse: string;
}

export function useLeadSummary() {
  return useMutation({
    mutationKey: ["ai-crm-lead-summary"],
    mutationFn: (leadId: number) =>
      apiClient.post<LeadSummaryResult>(`/ai/crm/leads/${leadId}/summary`, {}),
  });
}

export function useDealSummary() {
  return useMutation({
    mutationKey: ["ai-crm-deal-summary"],
    mutationFn: (dealId: number) =>
      apiClient.post<DealSummaryResult>(`/ai/crm/deals/${dealId}/summary`, {}),
  });
}

export function useNextBestActionsAcrossPipeline() {
  return useMutation({
    mutationKey: ["ai-crm-next-best-actions"],
    mutationFn: (limit?: number) =>
      apiClient.post<NextBestActionsResult>("/ai/crm/next-best-actions", { limit }),
  });
}

export function useCrmEmailDraft() {
  return useMutation({
    mutationKey: ["ai-crm-email-draft"],
    mutationFn: (input: EmailDraftInput) =>
      apiClient.post<EmailDraftResult>("/ai/crm/email-draft", input),
  });
}

export function useSummarizeNotes() {
  return useMutation({
    mutationKey: ["ai-crm-summarize-notes"],
    mutationFn: (text: string) =>
      apiClient.post<SummarizeNotesResult>("/ai/crm/summarize-notes", { text }),
  });
}

export function useCrmObjectionHelp() {
  return useMutation({
    mutationKey: ["ai-crm-objection-help"],
    mutationFn: (input: { objection: string; context?: string }) =>
      apiClient.post<ObjectionHelpResult>("/ai/crm/objection-help", input),
  });
}

export function useDuplicateSuggestions() {
  return useMutation({
    mutationKey: ["ai-crm-duplicate-suggestions"],
    mutationFn: (leadId: number) =>
      apiClient.post<DuplicateSuggestionsResult>(`/ai/crm/duplicate-suggestions/${leadId}`, {}),
  });
}
