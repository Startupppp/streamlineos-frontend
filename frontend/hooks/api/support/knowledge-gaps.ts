"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  KnowledgeGap,
  ListKnowledgeGapsResponse,
  DetectGapsResponse,
  DraftGapResponse,
} from "@/features/support/lib/knowledge-gap.types";

export const knowledgeGapsKeys = {
  all: ["support", "knowledge-gaps"] as const,
  list: (cursor?: number) =>
    [...knowledgeGapsKeys.all, "list", cursor ?? null] as const,
};

export function useKnowledgeGaps(cursor?: number) {
  return useQuery<ListKnowledgeGapsResponse, Error>({
    queryKey: knowledgeGapsKeys.list(cursor),
    queryFn: () =>
      apiClient.get<ListKnowledgeGapsResponse>("/support/knowledge-gaps", {
        ...(cursor !== undefined ? { cursor: String(cursor) } : {}),
      }),
    staleTime: 30_000,
  });
}

export function useDetectGaps() {
  const queryClient = useQueryClient();
  return useMutation<DetectGapsResponse, Error>({
    mutationFn: () =>
      apiClient.post<DetectGapsResponse>("/support/knowledge-gaps/detect"),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: knowledgeGapsKeys.all });
    },
  });
}

export function useDraftGap() {
  const queryClient = useQueryClient();
  return useMutation<DraftGapResponse, Error, { gapId: number }>({
    mutationFn: ({ gapId }) =>
      apiClient.post<DraftGapResponse>(
        `/support/knowledge-gaps/${gapId}/draft`,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: knowledgeGapsKeys.all });
    },
  });
}

export function useDismissGap() {
  const queryClient = useQueryClient();
  return useMutation<KnowledgeGap, Error, { gapId: number }>({
    mutationFn: ({ gapId }) =>
      apiClient.patch<KnowledgeGap>(`/support/knowledge-gaps/${gapId}`, {
        action: "dismiss",
      }),
    onMutate: async ({ gapId }) => {
      await queryClient.cancelQueries({ queryKey: knowledgeGapsKeys.all });
      const snapshots = new Map<string, ListKnowledgeGapsResponse>();
      queryClient
        .getQueriesData<ListKnowledgeGapsResponse>({
          queryKey: knowledgeGapsKeys.all,
        })
        .forEach(([key, data]) => {
          if (!data) return;
          snapshots.set(JSON.stringify(key), data);
          queryClient.setQueryData<ListKnowledgeGapsResponse>(key, {
            ...data,
            gaps: data.gaps.map((g) =>
              g.id === gapId ? { ...g, status: "DISMISSED" as const } : g,
            ),
          });
        });
      return { snapshots };
    },
    onError: (_err, _vars, context) => {
      const ctx = context as
        | { snapshots: Map<string, ListKnowledgeGapsResponse> }
        | undefined;
      ctx?.snapshots.forEach((data, keyStr) => {
        queryClient.setQueryData(JSON.parse(keyStr) as string[], data);
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: knowledgeGapsKeys.all });
    },
  });
}
