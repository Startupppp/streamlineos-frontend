"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export type AiSuggestionType =
  | "summary"
  | "sentiment"
  | "category"
  | "priority"
  | "spam"
  | "reply"
  | "macro"
  | "kb_article"
  | "duplicate"
  | "handoff_summary"
  | "root_cause_cluster";

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
  qc.invalidateQueries({ queryKey: queryKeys.supportAiSuggestions.list(ticketId) });
}

export function useTicketAiSuggestions(ticketId: number) {
  return useQuery({
    queryKey: queryKeys.supportAiSuggestions.list(ticketId),
    queryFn: () => apiClient.get<AiSuggestion[]>(`/support/${ticketId}/ai/suggestions`),
    enabled: Number.isFinite(ticketId) && ticketId > 0,
    staleTime: 30_000,
  });
}

export function useAnalyzeTicket(ticketId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["supportAiSuggestions", "analyze", ticketId],
    mutationFn: () => apiClient.post<AiSuggestion[]>(`/support/${ticketId}/ai/analyze`),
    onSuccess: () => invalidateSuggestions(qc, ticketId),
  });
}

export function useFindDuplicates(ticketId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["supportAiSuggestions", "find-duplicates", ticketId],
    mutationFn: () => apiClient.post<AiSuggestion | null>(`/support/${ticketId}/ai/find-duplicates`),
    onSuccess: () => invalidateSuggestions(qc, ticketId),
  });
}

export function useSuggestKbArticles(ticketId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["supportAiSuggestions", "suggest-kb-articles", ticketId],
    mutationFn: () => apiClient.post<AiSuggestion | null>(`/support/${ticketId}/ai/suggest-kb-articles`),
    onSuccess: () => invalidateSuggestions(qc, ticketId),
  });
}

export function useSuggestReply(ticketId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["supportAiSuggestions", "suggest-reply", ticketId],
    mutationFn: () => apiClient.post<AiSuggestion | null>(`/support/${ticketId}/ai/suggest-reply`),
    onSuccess: () => invalidateSuggestions(qc, ticketId),
  });
}

export function useSuggestMacro(ticketId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["supportAiSuggestions", "suggest-macro", ticketId],
    mutationFn: () => apiClient.post<AiSuggestion | null>(`/support/${ticketId}/ai/suggest-macro`),
    onSuccess: () => invalidateSuggestions(qc, ticketId),
  });
}

export function useGenerateHandoffSummary(ticketId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["supportAiSuggestions", "handoff-summary", ticketId],
    mutationFn: () => apiClient.post<AiSuggestion | null>(`/support/${ticketId}/ai/handoff-summary`),
    onSuccess: () => invalidateSuggestions(qc, ticketId),
  });
}

export function useFindRootCauseCluster(ticketId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["supportAiSuggestions", "root-cause-cluster", ticketId],
    mutationFn: () => apiClient.post<AiSuggestion | null>(`/support/${ticketId}/ai/root-cause-cluster`),
    onSuccess: () => invalidateSuggestions(qc, ticketId),
  });
}

export function useTranslateMessage(ticketId: number) {
  return useMutation({
    mutationKey: ["supportAi", "translate", ticketId],
    mutationFn: ({ messageId, targetLanguage }: { messageId: number; targetLanguage: string }) =>
      apiClient.post<TranslateMessageResult | null>(`/support/${ticketId}/ai/translate`, {
        messageId,
        targetLanguage,
      }),
  });
}

export function useResolveAiSuggestion(ticketId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["supportAiSuggestions", "resolve", ticketId],
    mutationFn: ({ suggestionId, status, feedback }: ResolveAiSuggestionInput) =>
      apiClient.post<AiSuggestion>(`/support/ai-suggestions/${suggestionId}/resolve`, { status, feedback }),
    onSuccess: () => {
      invalidateSuggestions(qc, ticketId);
      qc.invalidateQueries({ queryKey: queryKeys.support.detail(ticketId) });
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

export interface SupportAiSettings {
  confidenceThreshold: number;
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
  return useMutation({
    mutationKey: ["supportAi", "improve-reply", ticketId],
    mutationFn: (input: ImproveReplyInput) =>
      apiClient.post<ImproveReplyResult>(`/support/ai/improve-reply`, { ticketId, ...input }),
  });
}

export function useTranslateDraft(ticketId: number) {
  return useMutation({
    mutationKey: ["supportAi", "translate-draft", ticketId],
    mutationFn: (input: TranslateDraftInput) =>
      apiClient.post<TranslateDraftResult>(`/support/ai/translate-draft`, { ticketId, ...input }),
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
  return useQuery({
    queryKey: queryKeys.supportAiReport.get(record),
    queryFn: () => apiClient.get<SupportAiReportResult>(`/support/ai/report`, record),
    staleTime: 2 * 60_000,
  });
}

export function useSupportAiSettings() {
  return useQuery({
    queryKey: queryKeys.supportAiSettings.get(),
    queryFn: () => apiClient.get<SupportAiSettings>(`/support/settings`),
    staleTime: 5 * 60_000,
  });
}

export function useUpdateSupportAiSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["supportAiSettings", "update"],
    mutationFn: (input: Partial<SupportAiSettings>) =>
      apiClient.patch<SupportAiSettings>(`/support/settings`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.supportAiSettings.all });
    },
  });
}
