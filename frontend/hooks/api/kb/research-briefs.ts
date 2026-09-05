"use client";

import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { useCan } from "@/hooks/api/access";
import type {
  KbResearchBrief,
  KbResearchBriefListItem,
  CreateResearchBriefInput,
} from "@/types/kb";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

interface BriefListResponse {
  items: KbResearchBriefListItem[];
  nextCursor: number | null;
}

export function useKbResearchBriefs(limit = 20) {
  const canViewPages = useCan("kb:pages:view");
  return useInfiniteQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.researchBriefs(limit),
    queryFn: ({ pageParam, signal }) => {
      const params: Record<string, unknown> = { limit };
      if (pageParam !== undefined) params.cursor = pageParam;
      return apiClient.get<BriefListResponse>("/kb/research-briefs", params, signal);
    },
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: canViewPages,
    staleTime: 30_000,
  });
}

export function useKbResearchBrief(briefId: number | undefined) {
  const canViewPages = useCan("kb:pages:view");
  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.researchBrief(briefId ?? 0),
    queryFn: ({ signal }) => apiClient.get<KbResearchBrief>(`/kb/research-briefs/${briefId}`, undefined, signal),
    enabled: canViewPages && briefId !== undefined && briefId > 0,
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
      apiClient.post<{ briefId: number; jobId: number }>("/kb/research-briefs", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.researchBriefs() }),
  });
}

export function useRateResearchBrief() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:view", {
    mutationKey: ["kb", "research-briefs", "rate"],
    mutationFn: ({ briefId, rating }: { briefId: number; rating: "helpful" | "not_helpful" }) =>
      apiClient.post<{ success: boolean }>(`/kb/research-briefs/${briefId}/rate`, { rating }),
    onSuccess: (_, { briefId }) => {
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.researchBrief(briefId) });
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.researchBriefs() });
    },
  });
}
