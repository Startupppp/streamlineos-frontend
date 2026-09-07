"use client";

import { useQueryClient } from "@tanstack/react-query";
import type { z } from "zod";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { supportAndWorkflowsQueryKeys } from "@/lib/query-keys/support-and-workflows";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { AiAbortInput } from "@/hooks/api/ai-abort";
import { useGatedQuery } from "@/hooks/api/gated-query";
import type {
  supportAiSuggestionRowContract,
  aiReplySourceContract,
} from "./support-ai-schema";

const supportAiSuggestionListC = lazyContract(() =>
  import("./support-ai-schema").then((m) => m.supportAiSuggestionListContract),
);
const supportAiSuggestionNullableC = lazyContract(() =>
  import("./support-ai-schema").then((m) => m.supportAiSuggestionNullableContract),
);
const supportAiSuggestionRowC = lazyContract(() =>
  import("./support-ai-schema").then((m) => m.supportAiSuggestionRowContract),
);
const supportAiAnalyzeResultC = lazyContract(() =>
  import("./support-ai-schema").then((m) => m.supportAiAnalyzeResultContract),
);
const supportAiTranslationC = lazyContract(() =>
  import("./support-ai-schema").then((m) => m.supportAiTranslationContract),
);
const supportAiImproveReplyC = lazyContract(() =>
  import("./support-ai-schema").then((m) => m.supportAiImproveReplyContract),
);
const supportAiReportC = lazyContract(() =>
  import("./support-ai-schema").then((m) => m.supportAiReportContract),
);

export type AiSuggestionStatus = "pending" | "accepted" | "rejected";
export type AiSuggestionFeedback = "helpful" | "not_helpful";
export type AiSentimentValue = "positive" | "neutral" | "negative";
export type AiPriorityValue = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type AiSuggestion = z.infer<typeof supportAiSuggestionRowContract>;
export type AiReplySource = z.infer<typeof aiReplySourceContract>;

export type AiSummarySuggestion = Extract<AiSuggestion, { type: "summary" }>;
export type AiSentimentSuggestion = Extract<AiSuggestion, { type: "sentiment" }>;
export type AiCategorySuggestion = Extract<AiSuggestion, { type: "category" }>;
export type AiPrioritySuggestion = Extract<AiSuggestion, { type: "priority" }>;
export type AiSpamSuggestion = Extract<AiSuggestion, { type: "spam" }>;
export type AiReplySuggestion = Extract<AiSuggestion, { type: "reply" }>;
export type AiMacroSuggestion = Extract<AiSuggestion, { type: "macro" }>;
export type AiKbArticleSuggestion = Extract<AiSuggestion, { type: "kb_article" }>;
export type AiDuplicateSuggestion = Extract<AiSuggestion, { type: "duplicate" }>;
export type AiHandoffSummarySuggestion = Extract<AiSuggestion, { type: "handoff_summary" }>;
export type AiRootCauseClusterSuggestion = Extract<AiSuggestion, { type: "root_cause_cluster" }>;

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
    queryFn: ({ signal }) => apiClient.get<AiSuggestion[]>(`/support/${ticketId}/ai/suggestions`, undefined, signal, supportAiSuggestionListC),
    enabled: Number.isFinite(ticketId) && ticketId > 0,
    staleTime: 30_000,
  });
}

export function useAnalyzeTicket(ticketId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation<AiSuggestion[] | null, Error, AiAbortInput | void>("support:tickets:view", {
    mutationKey: ["supportAiSuggestions", "analyze", ticketId],
    mutationFn: (input) =>
      apiClient.post<AiSuggestion[] | null>(`/support/${ticketId}/ai/analyze`, undefined, { signal: input?.signal }, supportAiAnalyzeResultC),
    onSuccess: () => invalidateSuggestions(qc, ticketId),
  });
}

export function useFindDuplicates(ticketId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation<AiSuggestion | null, Error, AiAbortInput | void>("support:tickets:view", {
    mutationKey: ["supportAiSuggestions", "find-duplicates", ticketId],
    mutationFn: (input) =>
      apiClient.post<AiSuggestion | null>(`/support/${ticketId}/ai/find-duplicates`, undefined, { signal: input?.signal }, supportAiSuggestionNullableC),
    onSuccess: () => invalidateSuggestions(qc, ticketId),
  });
}

export function useSuggestKbArticles(ticketId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation<AiSuggestion | null, Error, AiAbortInput | void>("support:tickets:view", {
    mutationKey: ["supportAiSuggestions", "suggest-kb-articles", ticketId],
    mutationFn: (input) =>
      apiClient.post<AiSuggestion | null>(`/support/${ticketId}/ai/suggest-kb-articles`, undefined, { signal: input?.signal }, supportAiSuggestionNullableC),
    onSuccess: () => invalidateSuggestions(qc, ticketId),
  });
}

export function useSuggestReply(ticketId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation<AiSuggestion | null, Error, AiAbortInput | void>("support:tickets:reply", {
    mutationKey: ["supportAiSuggestions", "suggest-reply", ticketId],
    mutationFn: (input) =>
      apiClient.post<AiSuggestion | null>(`/support/${ticketId}/ai/suggest-reply`, undefined, { signal: input?.signal }, supportAiSuggestionNullableC),
    onSuccess: () => invalidateSuggestions(qc, ticketId),
  });
}

export function useSuggestMacro(ticketId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation<AiSuggestion | null, Error, AiAbortInput | void>("support:tickets:reply", {
    mutationKey: ["supportAiSuggestions", "suggest-macro", ticketId],
    mutationFn: (input) =>
      apiClient.post<AiSuggestion | null>(`/support/${ticketId}/ai/suggest-macro`, undefined, { signal: input?.signal }, supportAiSuggestionNullableC),
    onSuccess: () => invalidateSuggestions(qc, ticketId),
  });
}

export function useGenerateHandoffSummary(ticketId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation<AiSuggestion | null, Error, AiAbortInput | void>("support:tickets:view", {
    mutationKey: ["supportAiSuggestions", "handoff-summary", ticketId],
    mutationFn: (input) =>
      apiClient.post<AiSuggestion | null>(`/support/${ticketId}/ai/handoff-summary`, undefined, { signal: input?.signal }, supportAiSuggestionNullableC),
    onSuccess: () => invalidateSuggestions(qc, ticketId),
  });
}

export function useFindRootCauseCluster(ticketId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation<AiSuggestion | null, Error, AiAbortInput | void>("support:tickets:view", {
    mutationKey: ["supportAiSuggestions", "root-cause-cluster", ticketId],
    mutationFn: (input) =>
      apiClient.post<AiSuggestion | null>(`/support/${ticketId}/ai/root-cause-cluster`, undefined, { signal: input?.signal }, supportAiSuggestionNullableC),
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
        supportAiTranslationC,
      ),
  });
}

export function useResolveAiSuggestion(ticketId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:tickets:reply", {
    mutationKey: ["supportAiSuggestions", "resolve", ticketId],
    mutationFn: ({ suggestionId, status, feedback }: ResolveAiSuggestionInput) =>
      apiClient.post<AiSuggestion>(`/support/ai-suggestions/${suggestionId}/resolve`, { status, feedback }, undefined, supportAiSuggestionRowC),
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
      apiClient.post<ImproveReplyResult>(`/support/ai/improve-reply`, { ticketId, ...input }, { signal }, supportAiImproveReplyC),
  });
}

export function useTranslateDraft(ticketId: number) {
  return useAuthorizedMutation("support:ai:invoke", {
    mutationKey: ["supportAi", "translate-draft", ticketId],
    mutationFn: ({ signal, ...input }: TranslateDraftInput & AiAbortInput) =>
      apiClient.post<TranslateDraftResult>(`/support/ai/translate-draft`, { ticketId, ...input }, { signal }, supportAiTranslationC),
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
    queryFn: ({ signal }) => apiClient.get<SupportAiReportResult>(`/support/ai/report`, record, signal, supportAiReportC),
    staleTime: 2 * 60_000,
  });
}

