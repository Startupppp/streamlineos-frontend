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
  | "duplicate";

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

export interface AiReplyPayload {
  body: string;
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

export type AiSuggestion =
  | AiSummarySuggestion
  | AiSentimentSuggestion
  | AiCategorySuggestion
  | AiPrioritySuggestion
  | AiSpamSuggestion
  | AiReplySuggestion
  | AiMacroSuggestion
  | AiKbArticleSuggestion
  | AiDuplicateSuggestion;

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
