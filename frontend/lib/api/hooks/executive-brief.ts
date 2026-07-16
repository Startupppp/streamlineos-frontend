"use client";

import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

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
}

export interface LatestBriefResponse {
  snapshot: ExecutiveBriefSnapshot | null;
  isStale: boolean;
  staleSinceMinutes?: number;
}

const briefQueryOptions = queryOptions({
  queryKey: ["executive-brief"] as const,
  queryFn: () => apiClient.get<LatestBriefResponse>("/ai/executive-brief"),
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
