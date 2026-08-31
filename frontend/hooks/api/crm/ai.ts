"use client";

import { apiClient } from "@/lib/api-client";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

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

interface EvidenceItem {
  kind: "activity" | "stage" | "signal" | "field";
  label: string;
  value: string;
}

interface NextBestActionsWithEvidenceResult {
  actions: Array<{
    leadId: number;
    leadName: string;
    action: string;
    urgency: "low" | "medium" | "high" | "critical";
    reasoning: string;
    evidence: EvidenceItem[];
    rationale: string;
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

interface Citation {
  id: string;
  title: string;
  snippet?: string;
}

interface LeadSummaryWithCitationsResult {
  summary: string;
  nextBestActions: string[];
  citations: Citation[];
  generatedAt: string;
}

interface DealSummaryWithCitationsResult {
  stage: string;
  summary: string;
  risks: string[];
  recommendedPlays: string[];
  stakeholdersGap: string;
  citations: Citation[];
  generatedAt: string;
}

interface AccountSummaryWithCitationsResult {
  summary: string;
  clientName: string;
  citations: Citation[];
  generatedAt: string;
}

interface MeetingFollowUpInput {
  meetingTitle: string;
  attendeeType: "lead" | "client";
  attendeeId: number;
  outcome: string;
  actionItems?: string[];
  scheduledAt: string;
  notes?: string;
}

interface MeetingFollowUpResult {
  draft: string;
  attendeeName: string;
  generatedAt: string;
}






export function useLeadSummary() {
  return useAuthorizedMutation("crm:ai:use", {
    mutationKey: ["ai-crm-lead-summary"],
    mutationFn: (leadId: number) =>
      apiClient.post<LeadSummaryResult>(`/ai/crm/leads/${leadId}/summary`, {}),
  });
}

export function useDealSummary() {
  return useAuthorizedMutation("crm:ai:use", {
    mutationKey: ["ai-crm-deal-summary"],
    mutationFn: (dealId: number) =>
      apiClient.post<DealSummaryResult>(`/ai/crm/deals/${dealId}/summary`, {}),
  });
}

export function useNextBestActionsAcrossPipeline() {
  return useAuthorizedMutation("crm:ai:use", {
    mutationKey: ["ai-crm-next-best-actions"],
    mutationFn: (limit?: number) =>
      apiClient.post<NextBestActionsWithEvidenceResult>("/ai/crm/next-best-actions", { limit }),
  });
}

export function useCrmEmailDraft() {
  return useAuthorizedMutation("crm:ai:use", {
    mutationKey: ["ai-crm-email-draft"],
    mutationFn: (input: EmailDraftInput) =>
      apiClient.post<EmailDraftResult>("/ai/crm/email-draft", input),
  });
}

export function useSummarizeNotes() {
  return useAuthorizedMutation("crm:ai:use", {
    mutationKey: ["ai-crm-summarize-notes"],
    mutationFn: (text: string) =>
      apiClient.post<SummarizeNotesResult>("/ai/crm/summarize-notes", { text }),
  });
}

export function useCrmObjectionHelp() {
  return useAuthorizedMutation("crm:ai:use", {
    mutationKey: ["ai-crm-objection-help"],
    mutationFn: (input: { objection: string; context?: string }) =>
      apiClient.post<ObjectionHelpResult>("/ai/crm/objection-help", input),
  });
}

export function useDuplicateSuggestions() {
  return useAuthorizedMutation("crm:ai:use", {
    mutationKey: ["ai-crm-duplicate-suggestions"],
    mutationFn: (leadId: number) =>
      apiClient.post<DuplicateSuggestionsResult>(`/ai/crm/duplicate-suggestions/${leadId}`, {}),
  });
}

export function useLeadSummaryWithCitations() {
  return useAuthorizedMutation("crm:ai:use", {
    mutationKey: ["ai-crm-lead-summary-citations"],
    mutationFn: (leadId: number) =>
      apiClient.post<LeadSummaryWithCitationsResult>(`/ai/crm/leads/${leadId}/summary-with-citations`, {}),
  });
}

export function useDealSummaryWithCitations() {
  return useAuthorizedMutation("crm:ai:use", {
    mutationKey: ["ai-crm-deal-summary-citations"],
    mutationFn: (dealId: number) =>
      apiClient.post<DealSummaryWithCitationsResult>(`/ai/crm/deals/${dealId}/summary-with-citations`, {}),
  });
}

export function useAccountSummaryWithCitations() {
  return useAuthorizedMutation("crm:ai:use", {
    mutationKey: ["ai-crm-account-summary-citations"],
    mutationFn: (clientId: number) =>
      apiClient.post<AccountSummaryWithCitationsResult>("/ai/crm/account-summary-with-citations", { clientId }),
  });
}

export function useMeetingFollowUpDraft() {
  return useAuthorizedMutation("crm:ai:use", {
    mutationKey: ["ai-crm-meeting-follow-up"],
    mutationFn: (input: MeetingFollowUpInput) =>
      apiClient.post<MeetingFollowUpResult>("/ai/crm/meeting-follow-up", input),
  });
}
