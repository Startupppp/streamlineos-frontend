"use client";

import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { useCan } from "@/hooks/api/access";
import type {
  KbResearchBrief,
  KbResearchBriefListPage,
  CreateResearchBriefInput,
} from "@/types/kb";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { useIdempotentOperation } from "@/hooks/common/use-idempotent-operation";
import { kbResearchBriefsQueryOptions, kbResearchBriefQueryOptions } from "./kb-read-options";

const RESEARCH_BRIEFS_PAGE_SIZE = 20;

const kbResearchBriefListContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-research-schema").then((m) => m.kbResearchBriefListContract),
);

const kbResearchBriefDetailContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-research-schema").then((m) => m.kbResearchBriefDetailContract),
);

const kbResearchBriefEnqueueContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-research-schema").then((m) => m.kbResearchBriefEnqueueContract),
);

const kbResearchBriefRateContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-research-schema").then((m) => m.kbResearchBriefRateContract),
);

const kbConvertBriefToPageContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-research-schema").then((m) => m.kbConvertBriefToPageContract),
);

const kbResearchBriefApproveContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-research-schema").then((m) => m.kbResearchBriefApproveContract),
);

export function useKbResearchBriefs() {
  const canViewPages = useCan("kb:pages:view");
  return useInfiniteQuery({
    ...kbResearchBriefsQueryOptions,
    queryFn: ({ pageParam, signal }) => {
      const params: Record<string, unknown> = { limit: RESEARCH_BRIEFS_PAGE_SIZE };
      if (pageParam !== undefined) params.cursor = pageParam;
      return apiClient.get<KbResearchBriefListPage>("/kb/research-briefs", params, signal, kbResearchBriefListContract);
    },
    enabled: canViewPages,
    ...INLINE_READ_ERROR,
  });
}

export const RESEARCH_BRIEF_POLL_MS = 3_000;

export function researchBriefPollInterval(
  status: KbResearchBrief["status"] | undefined,
): number | false {
  return status === "queued" || status === "running"
    ? RESEARCH_BRIEF_POLL_MS
    : false;
}

export function useKbResearchBrief(briefId: number | undefined) {
  const canViewPages = useCan("kb:pages:view");
  return useQuery({
    ...kbResearchBriefQueryOptions(briefId ?? 0),
    queryFn: ({ signal }) => apiClient.get<KbResearchBrief>(`/kb/research-briefs/${briefId}`, undefined, signal, kbResearchBriefDetailContract),
    enabled: canViewPages && briefId !== undefined,
    ...INLINE_READ_ERROR,
    refetchInterval: (query) => researchBriefPollInterval(query.state.data?.status),
  });
}

export function useCreateResearchBrief() {
  const qc = useQueryClient();
  const operation = useIdempotentOperation();
  return useAuthorizedMutation("kb:pages:view", {
    mutationKey: ["kb", "research-briefs", "create"],
    mutationFn: (input: CreateResearchBriefInput) =>
      apiClient.post<{ briefId: number; jobId: number }>("/kb/research-briefs", input, operation.configFor(input), kbResearchBriefEnqueueContract),
    onSuccess: () => {
      operation.settle();
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.researchBriefs() });
    },
  });
}

export function useRateResearchBrief() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:view", {
    mutationKey: ["kb", "research-briefs", "rate"],
    mutationFn: ({ briefId, rating }: { briefId: number; rating: "helpful" | "not_helpful" }) =>
      apiClient.post<{ success: boolean }>(`/kb/research-briefs/${briefId}/rate`, { rating }, undefined, kbResearchBriefRateContract),
    onSuccess: (_, { briefId }) => {
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.researchBrief(briefId) });
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.researchBriefs() });
    },
  });
}

export function useRetryResearchBrief() {
  const qc = useQueryClient();
  const operation = useIdempotentOperation();
  return useAuthorizedMutation("kb:pages:view", {
    mutationKey: ["kb", "research-briefs", "retry"],
    mutationFn: (briefId: number) =>
      apiClient.post<{ briefId: number; jobId: number }>(`/kb/research-briefs/${briefId}/retry`, {}, operation.configFor({ briefId }), kbResearchBriefEnqueueContract),
    onSuccess: (_, briefId) => {
      operation.settle();
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.researchBrief(briefId) });
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.researchBriefs() });
    },
  });
}

export function useConvertResearchBriefToPage() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:create", {
    mutationKey: ["kb", "research-briefs", "convert-to-page"],
    mutationFn: (briefId: number) =>
      apiClient.post<{ pageId: number }>(
        `/kb/research-briefs/${briefId}/convert-to-page`,
        {},
        undefined,
        kbConvertBriefToPageContract,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.pageCollection() });
    },
  });
}

export function useCancelResearchBrief() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:view", {
    mutationKey: ["kb", "research-briefs", "cancel"],
    mutationFn: (briefId: number) =>
      apiClient.delete<void>(`/kb/research-briefs/${briefId}`, undefined, undefined),
    onSuccess: (_, briefId) => {
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.researchBrief(briefId) });
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.researchBriefs() });
    },
  });
}

export function useApproveResearchBrief() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:manage", {
    mutationKey: ["kb", "research-briefs", "approve"],
    mutationFn: (briefId: number) =>
      apiClient.post<{ success: true }>(`/kb/research-briefs/${briefId}/approve`, {}, undefined, kbResearchBriefApproveContract),
    onSuccess: (_, briefId) => {
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.researchBrief(briefId) });
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.researchBriefs() });
    },
  });
}
