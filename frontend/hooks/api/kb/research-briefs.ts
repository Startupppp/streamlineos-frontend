"use client";

import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  KbResearchBrief,
  KbResearchBriefListItem,
  CreateResearchBriefInput,
} from "@/types/kb";

interface BriefListResponse {
  items: KbResearchBriefListItem[];
  nextCursor: number | null;
}

export function useKbResearchBriefs(limit = 20) {
  return useInfiniteQuery({
    queryKey: queryKeys.kb.researchBriefs(),
    queryFn: ({ pageParam }) => {
      const params: Record<string, unknown> = { limit };
      if (pageParam) params.cursor = pageParam;
      return apiClient.get<BriefListResponse>("/kb/research-briefs", params);
    },
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: 30_000,
  });
}

export function useKbResearchBrief(briefId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.kb.researchBrief(briefId ?? 0),
    queryFn: () => apiClient.get<KbResearchBrief>(`/kb/research-briefs/${briefId}`),
    enabled: briefId !== undefined && briefId > 0,
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
  return useMutation({
    mutationKey: ["kb", "research-briefs", "create"],
    mutationFn: (input: CreateResearchBriefInput) =>
      apiClient.post<{ briefId: number; jobId: number }>("/kb/research-briefs", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.kb.researchBriefs() }),
  });
}

export function useRateResearchBrief() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["kb", "research-briefs", "rate"],
    mutationFn: ({ briefId, rating }: { briefId: number; rating: "helpful" | "not_helpful" }) =>
      apiClient.post<{ success: boolean }>(`/kb/research-briefs/${briefId}/rate`, { rating }),
    onSuccess: (_data, { briefId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.researchBrief(briefId) });
      qc.invalidateQueries({ queryKey: queryKeys.kb.researchBriefs() });
    },
  });
}
