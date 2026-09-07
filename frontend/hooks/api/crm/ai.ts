"use client";

import { apiClient } from "@/lib/api-client";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { AiAbortInput } from "@/hooks/api/ai-abort";
import { lazyContract } from "@/lib/api-envelope";

const leadSummaryLazy = lazyContract(() => import("@/hooks/api/crm/ai-schema").then((m) => m.leadSummaryContract));
const dealSummaryLazy = lazyContract(() => import("@/hooks/api/crm/ai-schema").then((m) => m.dealSummaryContract));
const nextBestActionsLazy = lazyContract(() => import("@/hooks/api/crm/ai-schema").then((m) => m.nextBestActionsContract));
const emailDraftLazy = lazyContract(() => import("@/hooks/api/crm/ai-schema").then((m) => m.emailDraftContract));
const leadEnrichmentLazy = lazyContract(() => import("@/hooks/api/crm/ai-schema").then((m) => m.leadEnrichmentContract));


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
      apiClient.post<LeadSummaryResult>(`/ai/crm/leads/${leadId}/summary`, {}, undefined, leadSummaryLazy),
  });
}

export function useDealSummary() {
  return useAuthorizedMutation("crm:ai:use", {
    mutationKey: ["ai-crm-deal-summary"],
    mutationFn: (dealId: number) =>
      apiClient.post<DealSummaryResult>(`/ai/crm/deals/${dealId}/summary`, {}, undefined, dealSummaryLazy),
  });
}

export function useNextBestActionsAcrossPipeline() {
  return useAuthorizedMutation("crm:ai:use", {
    mutationKey: ["ai-crm-next-best-actions"],
    mutationFn: ({ limit, signal }: { limit?: number } & AiAbortInput) =>
      apiClient.post<NextBestActionsWithEvidenceResult>(
        "/ai/crm/next-best-actions",
        { limit },
        { signal },
        nextBestActionsLazy,
      ),
  });
}

export function useCrmEmailDraft() {
  return useAuthorizedMutation("crm:ai:use", {
    mutationKey: ["ai-crm-email-draft"],
    mutationFn: ({ signal, ...input }: EmailDraftInput & AiAbortInput) =>
      apiClient.post<EmailDraftResult>("/ai/crm/email-draft", input, { signal }, emailDraftLazy),
  });
}

export function useSummarizeNotes() {
  return useAuthorizedMutation("crm:ai:use", {
    mutationKey: ["ai-crm-summarize-notes"],
    mutationFn: (text: string) =>
      apiClient.post<SummarizeNotesResult>("/ai/crm/summarize-notes", { text }, undefined, leadSummaryLazy),
  });
}

export function useCrmObjectionHelp() {
  return useAuthorizedMutation("crm:ai:use", {
    mutationKey: ["ai-crm-objection-help"],
    mutationFn: ({
      signal,
      ...input
    }: { objection: string; context?: string } & AiAbortInput) =>
      apiClient.post<ObjectionHelpResult>("/ai/crm/objection-help", input, { signal }, leadEnrichmentLazy),
  });
}

export function useDuplicateSuggestions() {
  return useAuthorizedMutation("crm:ai:use", {
    mutationKey: ["ai-crm-duplicate-suggestions"],
    mutationFn: ({ leadId, signal }: { leadId: number } & AiAbortInput) =>
      apiClient.post<DuplicateSuggestionsResult>(
        `/ai/crm/duplicate-suggestions/${leadId}`,
        {},
        { signal },
        leadSummaryLazy,
      ),
  });
}

export function useLeadSummaryWithCitations() {
  return useAuthorizedMutation("crm:ai:use", {
    mutationKey: ["ai-crm-lead-summary-citations"],
    mutationFn: ({ leadId, signal }: { leadId: number } & AiAbortInput) =>
      apiClient.post<LeadSummaryWithCitationsResult>(
        `/ai/crm/leads/${leadId}/summary-with-citations`,
        {},
        { signal },
        leadSummaryLazy,
      ),
  });
}

export function useDealSummaryWithCitations() {
  return useAuthorizedMutation("crm:ai:use", {
    mutationKey: ["ai-crm-deal-summary-citations"],
    mutationFn: ({ dealId, signal }: { dealId: number } & AiAbortInput) =>
      apiClient.post<DealSummaryWithCitationsResult>(
        `/ai/crm/deals/${dealId}/summary-with-citations`,
        {},
        { signal },
        dealSummaryLazy,
      ),
  });
}

export function useAccountSummaryWithCitations() {
  return useAuthorizedMutation("crm:ai:use", {
    mutationKey: ["ai-crm-account-summary-citations"],
    mutationFn: ({ clientId, signal }: { clientId: number } & AiAbortInput) =>
      apiClient.post<AccountSummaryWithCitationsResult>(
        "/ai/crm/account-summary-with-citations",
        { clientId },
        { signal },
        leadSummaryLazy,
      ),
  });
}

export function useMeetingFollowUpDraft() {
  return useAuthorizedMutation("crm:ai:use", {
    mutationKey: ["ai-crm-meeting-follow-up"],
    mutationFn: ({ signal, ...input }: MeetingFollowUpInput & AiAbortInput) =>
      apiClient.post<MeetingFollowUpResult>("/ai/crm/meeting-follow-up", input, { signal }, emailDraftLazy),
  });
}
