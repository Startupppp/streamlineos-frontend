"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { SnapshotWithDiff, SaveSnapshotPayload, AiSummarySnapshot } from "@/features/ai-summaries/types";

export function useLatestSnapshot(entityType: string, entityId: string) {
  return useQuery({
    queryKey: queryKeys.aiSummaries.latest(entityType, entityId),
    queryFn: ({ signal }) =>
      apiClient.get<SnapshotWithDiff | null>(`/ai/summaries/${entityType}/${entityId}`, undefined, signal),
    staleTime: 2 * 60_000,
  });
}

export function useSaveSnapshot(entityType: string, entityId: string) {
  return useMutation({
    mutationKey: ["ai", "summaries", entityType, entityId, "save"],
    mutationFn: (payload: SaveSnapshotPayload) =>
      apiClient.post<AiSummarySnapshot>(
        `/ai/summaries/${entityType}/${entityId}/snapshot`,
        payload,
      ),
  });
}
