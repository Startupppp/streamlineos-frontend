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
import { NO_ID_CURSOR_YET } from "@/hooks/api/cursor-page-param";

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

export function useKbResearchBriefs() {
  const canViewPages = useCan("kb:pages:view");
  return useInfiniteQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.researchBriefs(),
    queryFn: ({ pageParam, signal }) => {
      const params: Record<string, unknown> = { limit: RESEARCH_BRIEFS_PAGE_SIZE };
      if (pageParam !== undefined) params.cursor = pageParam;
      return apiClient.get<KbResearchBriefListPage>("/kb/research-briefs", params, signal, kbResearchBriefListContract);
    },
    initialPageParam: NO_ID_CURSOR_YET,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: canViewPages,
    staleTime: 30_000,
  });
}

export function useKbResearchBrief(briefId: number | undefined) {
  const canViewPages = useCan("kb:pages:view");
  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.researchBrief(briefId ?? 0),
    queryFn: ({ signal }) => apiClient.get<KbResearchBrief>(`/kb/research-briefs/${briefId}`, undefined, signal, kbResearchBriefDetailContract),
    enabled: canViewPages && briefId !== undefined,
    staleTime: 10_000,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status === "queued" || data?.status === "running") return 3_000;
      return false;
    },
  });
}

export function useCreateResearchBrief() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:view", {
    mutationKey: ["kb", "research-briefs", "create"],
    mutationFn: (input: CreateResearchBriefInput) =>
      apiClient.post<{ briefId: number; jobId: number }>("/kb/research-briefs", input, undefined, kbResearchBriefEnqueueContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.researchBriefs() }),
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
  return useAuthorizedMutation("kb:pages:view", {
    mutationKey: ["kb", "research-briefs", "retry"],
    mutationFn: (briefId: number) =>
      apiClient.post<{ briefId: number; jobId: number }>(`/kb/research-briefs/${briefId}/retry`, {}, undefined, kbResearchBriefEnqueueContract),
    onSuccess: (_, briefId) => {
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.researchBrief(briefId) });
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.researchBriefs() });
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
