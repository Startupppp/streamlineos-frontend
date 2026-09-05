"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { supportAndWorkflowsQueryKeys } from "@/lib/query-keys/support-and-workflows";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { AiAbortInput } from "@/hooks/api/ai-abort";
import { useGatedQuery } from "@/hooks/api/gated-query";

export type AiSuggestionStatus = "pending" | "accepted" | "rejected";
export type AiSuggestionFeedback = "helpful" | "not_helpful";
export type AiSentimentValue = "positive" | "neutral" | "negative";
export type AiPriorityValue = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface AiSummaryPayload {
  text: string;
}

export interface AiSentimentPayload {
  sentiment: AiSentimentValue;
}

export interface AiCategoryPayload {
  category: string;
}

export interface AiPriorityPayload {
  priority: AiPriorityValue;
}

export interface AiSpamPayload {
  isSpam: true;
}

export interface AiReplySource {
  title: string;
  url: string;
  articleId: number;
}

export interface AiReplyPayload {
  body: string;
  sources?: AiReplySource[];
  escalated?: boolean;
}

export interface AiMacroPayload {
  macroId: number;
  reason: string;
}

export interface AiKbArticlePayload {
  articles: { articleId: number; title: string; slug: string; similarity: number }[];
}

export interface AiDuplicatePayload {
  candidateTicketId: number;
  title: string;
}

export interface AiHandoffSummaryPayload {
  summary: string;
  keyPoints: string[];
  suggestedNextStep: string;
  sources?: AiReplySource[];
}

export interface AiRootCauseClusterPayload {
  relatedTicketIds: number[];
  rootCause: string;
  summary: string;
}

interface AiSuggestionBase {
  id: number;
  orgId: string;
  ticketId: number;
  confidence: string | null;
  status: AiSuggestionStatus;
  feedback: AiSuggestionFeedback | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  createdAt: string;
}

export interface AiSummarySuggestion extends AiSuggestionBase {
  type: "summary";
  payload: AiSummaryPayload;
}

export interface AiSentimentSuggestion extends AiSuggestionBase {
  type: "sentiment";
  payload: AiSentimentPayload;
}

export interface AiCategorySuggestion extends AiSuggestionBase {
  type: "category";
  payload: AiCategoryPayload;
}

export interface AiPrioritySuggestion extends AiSuggestionBase {
  type: "priority";
  payload: AiPriorityPayload;
}

export interface AiSpamSuggestion extends AiSuggestionBase {
  type: "spam";
  payload: AiSpamPayload;
}

export interface AiReplySuggestion extends AiSuggestionBase {
  type: "reply";
  payload: AiReplyPayload;
}

export interface AiMacroSuggestion extends AiSuggestionBase {
  type: "macro";
  payload: AiMacroPayload;
}

export interface AiKbArticleSuggestion extends AiSuggestionBase {
  type: "kb_article";
  payload: AiKbArticlePayload;
}

export interface AiDuplicateSuggestion extends AiSuggestionBase {
  type: "duplicate";
  payload: AiDuplicatePayload;
}

export interface AiHandoffSummarySuggestion extends AiSuggestionBase {
  type: "handoff_summary";
  payload: AiHandoffSummaryPayload;
}

export interface AiRootCauseClusterSuggestion extends AiSuggestionBase {
  type: "root_cause_cluster";
  payload: AiRootCauseClusterPayload;
}

export type AiSuggestion =
  | AiSummarySuggestion
  | AiSentimentSuggestion
  | AiCategorySuggestion
  | AiPrioritySuggestion
  | AiSpamSuggestion
  | AiReplySuggestion
  | AiMacroSuggestion
  | AiKbArticleSuggestion
  | AiDuplicateSuggestion
  | AiHandoffSummarySuggestion
  | AiRootCauseClusterSuggestion;

export interface TranslateMessageResult {
  translatedText: string;
  detectedSourceLanguage: string;
}

interface ResolveAiSuggestionInput {
  suggestionId: number;
  status: "accepted" | "rejected";
  feedback?: AiSuggestionFeedback;
}

function invalidateSuggestions(qc: ReturnType<typeof useQueryClient>, ticketId: number) {
  qc.invalidateQueries({ queryKey: supportAndWorkflowsQueryKeys.supportAiSuggestions.list(ticketId) });
}

export function useTicketAiSuggestions(ticketId: number) {
  return useGatedQuery("support:tickets:view", {
    queryKey: supportAndWorkflowsQueryKeys.supportAiSuggestions.list(ticketId),
    queryFn: ({ signal }) => apiClient.get<AiSuggestion[]>(`/support/${ticketId}/ai/suggestions`, undefined, signal),
    enabled: Number.isFinite(ticketId) && ticketId > 0,
    staleTime: 30_000,
  });
}

export function useAnalyzeTicket(ticketId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation<AiSuggestion[], Error, AiAbortInput | void>("support:tickets:view", {
    mutationKey: ["supportAiSuggestions", "analyze", ticketId],
    mutationFn: (input) =>
      apiClient.post<AiSuggestion[]>(`/support/${ticketId}/ai/analyze`, undefined, { signal: input?.signal }),
    onSuccess: () => invalidateSuggestions(qc, ticketId),
  });
}

export function useFindDuplicates(ticketId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation<AiSuggestion | null, Error, AiAbortInput | void>("support:tickets:view", {
    mutationKey: ["supportAiSuggestions", "find-duplicates", ticketId],
    mutationFn: (input) =>
      apiClient.post<AiSuggestion | null>(`/support/${ticketId}/ai/find-duplicates`, undefined, { signal: input?.signal }),
    onSuccess: () => invalidateSuggestions(qc, ticketId),
  });
}

export function useSuggestKbArticles(ticketId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation<AiSuggestion | null, Error, AiAbortInput | void>("support:tickets:view", {
    mutationKey: ["supportAiSuggestions", "suggest-kb-articles", ticketId],
    mutationFn: (input) =>
      apiClient.post<AiSuggestion | null>(`/support/${ticketId}/ai/suggest-kb-articles`, undefined, { signal: input?.signal }),
    onSuccess: () => invalidateSuggestions(qc, ticketId),
  });
}

export function useSuggestReply(ticketId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation<AiSuggestion | null, Error, AiAbortInput | void>("support:tickets:reply", {
    mutationKey: ["supportAiSuggestions", "suggest-reply", ticketId],
    mutationFn: (input) =>
      apiClient.post<AiSuggestion | null>(`/support/${ticketId}/ai/suggest-reply`, undefined, { signal: input?.signal }),
    onSuccess: () => invalidateSuggestions(qc, ticketId),
  });
}

export function useSuggestMacro(ticketId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation<AiSuggestion | null, Error, AiAbortInput | void>("support:tickets:reply", {
    mutationKey: ["supportAiSuggestions", "suggest-macro", ticketId],
    mutationFn: (input) =>
      apiClient.post<AiSuggestion | null>(`/support/${ticketId}/ai/suggest-macro`, undefined, { signal: input?.signal }),
    onSuccess: () => invalidateSuggestions(qc, ticketId),
  });
}

export function useGenerateHandoffSummary(ticketId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation<AiSuggestion | null, Error, AiAbortInput | void>("support:tickets:view", {
    mutationKey: ["supportAiSuggestions", "handoff-summary", ticketId],
    mutationFn: (input) =>
      apiClient.post<AiSuggestion | null>(`/support/${ticketId}/ai/handoff-summary`, undefined, { signal: input?.signal }),
    onSuccess: () => invalidateSuggestions(qc, ticketId),
  });
}

export function useFindRootCauseCluster(ticketId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation<AiSuggestion | null, Error, AiAbortInput | void>("support:tickets:view", {
    mutationKey: ["supportAiSuggestions", "root-cause-cluster", ticketId],
    mutationFn: (input) =>
      apiClient.post<AiSuggestion | null>(`/support/${ticketId}/ai/root-cause-cluster`, undefined, { signal: input?.signal }),
    onSuccess: () => invalidateSuggestions(qc, ticketId),
  });
}

export function useTranslateMessage(ticketId: number) {
  return useAuthorizedMutation("support:tickets:view", {
    mutationKey: ["supportAi", "translate", ticketId],
    mutationFn: ({ signal, ...body }: { messageId: number; targetLanguage: string } & AiAbortInput) =>
      apiClient.post<TranslateMessageResult | null>(
        `/support/${ticketId}/ai/translate`,
        body,
        { signal },
      ),
  });
}

export function useResolveAiSuggestion(ticketId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:tickets:reply", {
    mutationKey: ["supportAiSuggestions", "resolve", ticketId],
    mutationFn: ({ suggestionId, status, feedback }: ResolveAiSuggestionInput) =>
      apiClient.post<AiSuggestion>(`/support/ai-suggestions/${suggestionId}/resolve`, { status, feedback }),
    onSuccess: () => {
      invalidateSuggestions(qc, ticketId);
      qc.invalidateQueries({ queryKey: platformCoreQueryKeys.support.detail(ticketId) });
    },
  });
}

export interface ImproveReplyInput {
  content: string;
  macroId?: number;
}

export interface ImproveReplyResult {
  improved: string;
  changes: string[];
}

export interface TranslateDraftInput {
  language: string;
  content?: string;
}

export interface TranslateDraftResult {
  translatedText: string;
  detectedSourceLanguage: string;
}

export interface SupportAiReportParams {
  dateFrom?: string;
  dateTo?: string;
  cursor?: number;
  limit?: number;
}

export interface SupportAiReportResult {
  acceptanceRate: number;
  resolutionRate: number;
  reopenRate: number;
  escalationRate: number;
  sourceCoverage: number;
  unsupportedRate: number;
  csatImpact: { aiResolved: number | null; nonAiResolved: number | null } | null;
}

export function useImproveReply(ticketId: number) {
  return useAuthorizedMutation("support:ai:invoke", {
    mutationKey: ["supportAi", "improve-reply", ticketId],
    mutationFn: ({ signal, ...input }: ImproveReplyInput & AiAbortInput) =>
      apiClient.post<ImproveReplyResult>(`/support/ai/improve-reply`, { ticketId, ...input }, { signal }),
  });
}

export function useTranslateDraft(ticketId: number) {
  return useAuthorizedMutation("support:ai:invoke", {
    mutationKey: ["supportAi", "translate-draft", ticketId],
    mutationFn: ({ signal, ...input }: TranslateDraftInput & AiAbortInput) =>
      apiClient.post<TranslateDraftResult>(`/support/ai/translate-draft`, { ticketId, ...input }, { signal }),
  });
}

function reportParamsToRecord(params?: SupportAiReportParams): Record<string, unknown> | undefined {
  if (!params) return undefined;
  const out: Record<string, unknown> = {};
  if (params.dateFrom !== undefined) out["dateFrom"] = params.dateFrom;
  if (params.dateTo !== undefined) out["dateTo"] = params.dateTo;
  if (params.cursor !== undefined) out["cursor"] = params.cursor;
  if (params.limit !== undefined) out["limit"] = params.limit;
  return Object.keys(out).length > 0 ? out : undefined;
}

export function useSupportAiReport(params?: SupportAiReportParams) {
  const record = reportParamsToRecord(params);
  return useGatedQuery("support:ai:view", {
    queryKey: supportAndWorkflowsQueryKeys.supportAiReport.get(record),
    queryFn: ({ signal }) => apiClient.get<SupportAiReportResult>(`/support/ai/report`, record, signal),
    staleTime: 2 * 60_000,
  });
}

