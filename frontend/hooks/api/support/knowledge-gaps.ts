"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import type {
  KnowledgeGap,
  DraftedKnowledgeGap,
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
  return useAuthorizedMutation<
    DraftedKnowledgeGap,
    Error,
    { gapId: number; reason?: string },
    { snapshots: Array<[readonly unknown[], ListKnowledgeGapsResponse]> }
  >("support:knowledge-gaps:manage", {
    mutationKey: ["support", "knowledge-gaps", "dismiss"],
    mutationFn: ({ gapId, reason }) =>
      apiClient.patch<DraftedKnowledgeGap>(`/support/knowledge-gaps/${gapId}`, {
        action: "dismiss",
        ...(reason !== undefined && reason !== "" ? { reason } : {}),
      }, undefined, dismissGapResponseC),
    onMutate: async ({ gapId, reason }) => {
      await queryClient.cancelQueries({ queryKey: knowledgeGapsKeys.all });
      const snapshots: Array<[readonly unknown[], ListKnowledgeGapsResponse]> = [];
      queryClient
        .getQueriesData<ListKnowledgeGapsResponse>({
          queryKey: knowledgeGapsKeys.all,
        })
        .forEach(([key, data]) => {
          if (!data) return;
          snapshots.push([key, data]);
          queryClient.setQueryData<ListKnowledgeGapsResponse>(key, {
            ...data,
            gaps: data.gaps.map((g) =>
              g.id === gapId
                ? {
                    ...g,
                    status: "DISMISSED" as const,
                    dismissalReason:
                      reason !== undefined && reason !== ""
                        ? reason
                        : g.dismissalReason,
                  }
                : g,
            ),
          });
        });
      return { snapshots };
    },
    onError: (_, _vars, context) => {
      for (const [key, data] of context?.snapshots ?? [])
        queryClient.setQueryData(key, data);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: knowledgeGapsKeys.all });
    },
  });
}
