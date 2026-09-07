"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import type {
  KnowledgeGap,
  ListKnowledgeGapsResponse,
  DetectGapsResponse,
  DraftGapResponse,
} from "@/features/support/lib/knowledge-gap.types";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { queryKeyBase } from "@/lib/query-keys/base";
import { useGatedQuery } from "@/hooks/api/gated-query";

const gapListResponseC = lazyContract(() =>
  import("./knowledge-gap-schema").then((m) => m.gapListResponseContract),
);
const detectGapsJobC = lazyContract(() =>
  import("./knowledge-gap-schema").then((m) => m.detectGapsJobContract),
);
const proposeDraftResponseC = lazyContract(() =>
  import("./knowledge-gap-schema").then((m) => m.proposeDraftResponseContract),
);
const dismissGapResponseC = lazyContract(() =>
  import("./knowledge-gap-schema").then((m) => m.dismissGapResponseContract),
);

export const knowledgeGapsKeys = {
  all: [...queryKeyBase, "support", "knowledge-gaps"] as const,
  list: (cursor?: number) =>
    [...knowledgeGapsKeys.all, "list", cursor ?? null] as const,
};

export function useKnowledgeGaps(cursor?: number) {
  return useGatedQuery<ListKnowledgeGapsResponse, Error>("support:knowledge-gaps:view", {
    queryKey: knowledgeGapsKeys.list(cursor),
    queryFn: ({ signal }) =>
      apiClient.get<ListKnowledgeGapsResponse>("/support/knowledge-gaps", {
        ...(cursor !== undefined ? { cursor: String(cursor) } : {}),
      }, signal, gapListResponseC),
    staleTime: 30_000,
  });
}

export function useDetectGaps() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<DetectGapsResponse, Error>("support:knowledge-gaps:manage", {
    mutationKey: ["support", "knowledge-gaps", "detect"],
    mutationFn: () =>
      apiClient.post<DetectGapsResponse>("/support/knowledge-gaps/detect", undefined, undefined, detectGapsJobC),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: knowledgeGapsKeys.all });
    },
  });
}

export function useDraftGap() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<DraftGapResponse, Error, { gapId: number }>("support:knowledge-gaps:manage", {
    mutationKey: ["support", "knowledge-gaps", "draft"],
    mutationFn: ({ gapId }) =>
      apiClient.post<DraftGapResponse>(
        `/support/knowledge-gaps/${gapId}/draft`,
        undefined, undefined, proposeDraftResponseC,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: knowledgeGapsKeys.all });
    },
  });
}

export function useDismissGap() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<KnowledgeGap, Error, { gapId: number }>("support:knowledge-gaps:manage", {
    mutationKey: ["support", "knowledge-gaps", "dismiss"],
    mutationFn: ({ gapId }) =>
      apiClient.patch<KnowledgeGap>(`/support/knowledge-gaps/${gapId}`, {
        action: "dismiss",
      }, undefined, dismissGapResponseC),
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
    onError: (_, _vars, context) => {
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
