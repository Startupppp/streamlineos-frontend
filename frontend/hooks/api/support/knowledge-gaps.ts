"use client";

import {
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import type {
  DraftedKnowledgeGap,
  ListKnowledgeGapsResponse,
  DetectGapsResponse,
  DraftGapResponse,
} from "@/features/support/lib/knowledge-gap.types";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { queryKeyBase } from "@/lib/query-keys/base";
import { usePermissionGate } from "@/hooks/api/access";
import { gated } from "@/hooks/api/gated-query";
import { NO_ID_CURSOR_YET } from "@/hooks/api/cursor-page-param";

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
  list: () => [...knowledgeGapsKeys.all, "list"] as const,
};

export type KnowledgeGapPages = InfiniteData<
  ListKnowledgeGapsResponse,
  number | undefined
>;

export function useKnowledgeGaps() {
  const access = usePermissionGate("support:knowledge-gaps:view");
  return gated(
    useInfiniteQuery({
      queryKey: knowledgeGapsKeys.list(),
      queryFn: ({ pageParam, signal }) =>
        apiClient.get<ListKnowledgeGapsResponse>(
          "/support/knowledge-gaps",
          pageParam !== undefined ? { cursor: String(pageParam) } : {},
          signal,
          gapListResponseC,
        ),
      getNextPageParam: (lastPage: ListKnowledgeGapsResponse) =>
        lastPage.nextCursor ?? undefined,
      initialPageParam: NO_ID_CURSOR_YET,
      staleTime: 30_000,
      enabled: access.allowed,
    }),
    access,
  );
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
    { snapshots: Array<[readonly unknown[], KnowledgeGapPages]> }
  >("support:knowledge-gaps:manage", {
    mutationKey: ["support", "knowledge-gaps", "dismiss"],
    mutationFn: ({ gapId, reason }) =>
      apiClient.patch<DraftedKnowledgeGap>(`/support/knowledge-gaps/${gapId}`, {
        action: "dismiss",
        ...(reason !== undefined && reason !== "" ? { reason } : {}),
      }, undefined, dismissGapResponseC),
    onMutate: async ({ gapId, reason }) => {
      await queryClient.cancelQueries({ queryKey: knowledgeGapsKeys.all });
      const snapshots: Array<[readonly unknown[], KnowledgeGapPages]> = [];
      queryClient
        .getQueriesData<KnowledgeGapPages>({
          queryKey: knowledgeGapsKeys.all,
        })
        .forEach(([key, data]) => {
          if (!data) return;
          snapshots.push([key, data]);
          queryClient.setQueryData<KnowledgeGapPages>(key, {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              gaps: page.gaps.map((g) =>
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
            })),
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
