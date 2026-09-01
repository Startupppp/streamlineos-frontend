"use client";

import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { AiUsageMeta } from "@/components/ai/ai-usage-chip";

export interface BriefCitation {
  id: string;
  title: string;
  href: string;
}

export interface ExecutiveBriefSnapshot {
  narrative: string;
  citations: BriefCitation[];
  uncertaintyNotes: string[];
  generatedAt: string;
  aiUsage?: AiUsageMeta | null;
}

export interface LatestBriefResponse {
  snapshot: ExecutiveBriefSnapshot | null;
  isStale: boolean;
  staleSinceMinutes?: number;
}

const briefQueryOptions = queryOptions({
  queryKey: ["executive-brief"] as const,
  queryFn: ({ signal }) => apiClient.get<LatestBriefResponse>("/ai/executive-brief", undefined, signal),
  staleTime: 5 * 60 * 1000,
});

export function useExecutiveBrief() {
  return useQuery(briefQueryOptions);
}

export function useGenerateBrief() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["executive-brief", "generate"],
    mutationFn: () => apiClient.post<ExecutiveBriefSnapshot>("/ai/executive-brief/generate", {}),
    onSuccess: (data) => {
      qc.setQueryData(briefQueryOptions.queryKey, {
        snapshot: data,
        isStale: false,
      } satisfies LatestBriefResponse);
    },
  });
}
