"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { useCan } from "@/hooks/api/access";
import type {
  KbResearchBrief,
  KbResearchBriefListItem,
  CreateResearchBriefInput,
} from "@/types/kb";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

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
  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.researchBriefs(),
    queryFn: ({ signal }) =>
      apiClient.get<KbResearchBriefListItem[]>("/kb/research-briefs", undefined, signal, kbResearchBriefListContract),
    enabled: canViewPages,
    staleTime: 30_000,
  });
}

export function useKbResearchBrief(briefId: string | undefined) {
  const canViewPages = useCan("kb:pages:view");
  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.researchBrief(briefId ?? ""),
    queryFn: ({ signal }) => apiClient.get<KbResearchBrief>(`/kb/research-briefs/${briefId}`, undefined, signal, kbResearchBriefDetailContract),
    enabled: canViewPages && briefId !== undefined && briefId !== "",
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
      apiClient.post<{ jobId: string; status: string }>("/kb/research-briefs", input, undefined, kbResearchBriefEnqueueContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.researchBriefs() }),
  });
}

export function useRateResearchBrief() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:view", {
    mutationKey: ["kb", "research-briefs", "rate"],
    mutationFn: ({ briefId, rating }: { briefId: string; rating: "helpful" | "not_helpful" }) =>
      apiClient.post<{ success: boolean }>(`/kb/research-briefs/${briefId}/rate`, { rating }, undefined, kbResearchBriefRateContract),
    onSuccess: (_, { briefId }) => {
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.researchBrief(briefId) });
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.researchBriefs() });
    },
  });
}
