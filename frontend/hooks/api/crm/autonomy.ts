"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { usePermissionGate } from "@/hooks/api/access";
import { gated, useGatedQuery } from "@/hooks/api/gated-query";
import type {
  AutonomySettings,
  DecisionFilters,
  DecisionPage,
  LiveHold,
  ReviewQueueItem,
  Scoreboard,
  SwitchesResponse,
} from "@/types/crm/autonomy";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";


import { lazyContract } from "@/lib/api-envelope";

const decisionsPageLazy = lazyContract(() =>
  import("@/hooks/api/crm/autonomy-schema").then((m) => m.decisionsPageContract),
);
const switchesLazy = lazyContract(() =>
  import("@/hooks/api/crm/autonomy-schema").then((m) => m.switchesContract),
);
const scoreboardLazy = lazyContract(() =>
  import("@/hooks/api/crm/autonomy-schema").then((m) => m.scoreboardContract),
);
const reviewQueueLazy = lazyContract(() =>
  import("@/hooks/api/crm/autonomy-schema").then((m) => m.reviewQueueContract),
);
const autonomySettingsLazy = lazyContract(() =>
  import("@/hooks/api/crm/autonomy-schema").then((m) => m.autonomySettingsContract),
);
const liveHoldsLazy = lazyContract(() =>
  import("@/hooks/api/crm/autonomy-schema").then((m) => m.liveHoldsContract),
);
function toParams(filters: DecisionFilters, limit: number, cursor?: string): string {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor !== undefined) params.set("cursor", cursor);

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === "") continue;
    // Booleans are spelled out rather than coerced: the API reads `false` as
    // false, and sending nothing would mean "use the default" instead.
    params.set(key, String(value));
  }

  return params.toString();
}

/**
 * The review feed.
 *
 * Cursor-paginated, because the feed grows at the top while it is being read —
 * an offset page-2 request after the system has acted three more times silently
 * repeats rows or skips them.
 */
export function useAutonomyDecisions(filters: DecisionFilters = {}, limit = 25) {
  const access = usePermissionGate("crm:autonomy:view");

  return gated(
    useInfiniteQuery({
      queryKey: queryKeys.crm.autonomyDecisions({ ...filters, limit }),
      queryFn: ({ pageParam, signal }) =>
        apiClient.get<DecisionPage>(`/crm/autonomy/decisions?${toParams(filters, limit, pageParam as string | undefined)}`, undefined, signal),
      getNextPageParam: (lastPage: DecisionPage) => lastPage.pagination.nextCursor ?? undefined,
      initialPageParam: undefined as string | undefined,
      // Short, because a manager watching the feed wants to see the system act.
      staleTime: 15_000,
      enabled: access.allowed,
    }),
    access,
  );
}

/**
 * Undo one.
 *
 * Invalidates the whole feed rather than patching the row: a reversal changes
 * the deal or the task underneath it, so anything else on screen reading those
 * is now stale too.
 */
export function useReverseDecision() {
  const queryClient = useQueryClient();

  return useAuthorizedMutation("crm:autonomy:reverse", {
    mutationKey: ["crm", "autonomy", "decisions", "reverse"],
    mutationFn: ({
      decisionId,
      reason,
      consented,
    }: {
      decisionId: string;
      reason?: string;
      consented?: boolean;
    }) =>
      apiClient.post<{ reversed: boolean; action: string }>(
        `/crm/autonomy/decisions/${decisionId}/reverse`,
        { ...(reason ? { reason } : {}), consented: consented ?? false },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.crm.all });
    },
  });
}

export function useAutonomySwitches() {
  return useGatedQuery("crm:autonomy:view", {
    queryKey: queryKeys.crm.autonomySwitches(),
    queryFn: ({ signal }) => apiClient.get<SwitchesResponse>("/crm/autonomy/switches", undefined, signal, switchesLazy),
    staleTime: 30_000,
  });
}

/**
 * Turn one action type off, or back on.
 *
 * There is no optimistic update here on purpose. This is the control that stops
 * the product acting, and showing it as off a moment before it is would be the
 * one place an optimistic lie actually matters.
 */
export function useSetAutonomySwitch() {
  const queryClient = useQueryClient();

  return useAuthorizedMutation("crm:autonomy:manage", {
    mutationKey: ["crm", "autonomy", "switches", "set"],
    mutationFn: (input: { kind: string; enabled: boolean; reason?: string }) =>
      apiClient.patch<SwitchesResponse>("/crm/autonomy/switches", input),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.crm.autonomySwitches(), data);
    },
  });
}

/** How often the system was right, per action type, over a window. */
export function useAutonomyScoreboard(days = 30) {
  return useGatedQuery("crm:autonomy:view", {
    queryKey: queryKeys.crm.autonomyScoreboard(days),
    queryFn: ({ signal }) => apiClient.get<Scoreboard>(`/crm/autonomy/scoreboard?days=${days}`, undefined, signal),
    staleTime: 60_000,
  });
}

/** What a second pass disagreed with and nobody has looked at. */
export function useAutonomyReviewQueue() {
  return useGatedQuery("crm:autonomy:view", {
    queryKey: queryKeys.crm.autonomyReviewQueue(),
    queryFn: ({ signal }) => apiClient.get<ReviewQueueItem[]>("/crm/autonomy/review-queue", undefined, signal, reviewQueueLazy),
    staleTime: 30_000,
  });
}

export function useMarkReviewed() {
  const queryClient = useQueryClient();

  return useAuthorizedMutation("crm:autonomy:view", {
    mutationKey: ["crm", "autonomy", "review-queue", "mark-reviewed"],
    mutationFn: (shadowScoreId: string) =>
      apiClient.post<{ reviewed: boolean }>(
        `/crm/autonomy/review-queue/${shadowScoreId}/reviewed`,
        {},
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.crm.autonomyReviewQueue() });
    },
  });
}

export function useAutonomySettings() {
  return useGatedQuery("crm:autonomy:view", {
    queryKey: queryKeys.crm.autonomySettings(),
    queryFn: ({ signal }) => apiClient.get<AutonomySettings>("/crm/autonomy/settings", undefined, signal, autonomySettingsLazy),
    staleTime: 60_000,
  });
}

export function useUpdateAutonomySettings() {
  const queryClient = useQueryClient();

  return useAuthorizedMutation("crm:autonomy:manage", {
    mutationKey: ["crm", "autonomy", "settings", "update"],
    mutationFn: (patch: Partial<AutonomySettings>) =>
      apiClient.patch<AutonomySettings>("/crm/autonomy/settings", patch),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.crm.autonomySettings(), data);
    },
  });
}

/**
 * What is about to leave the building.
 *
 * Polled on a short interval rather than fetched once: the whole value of the
 * window is that somebody sees it while it is still open, and a stale list
 * showing a send that already went is worse than showing nothing.
 */
export function useLiveHolds() {
  return useGatedQuery("crm:autonomy:view", {
    queryKey: queryKeys.crm.autonomyHolds(),
    queryFn: ({ signal }) => apiClient.get<LiveHold[]>("/crm/autonomy/holds", undefined, signal, liveHoldsLazy),
    refetchInterval: 10_000,
    staleTime: 0,
  });
}

export function useCancelHold() {
  const queryClient = useQueryClient();

  return useAuthorizedMutation("crm:autonomy:reverse", {
    mutationKey: ["crm", "autonomy", "holds", "cancel"],
    mutationFn: ({ holdId, reason }: { holdId: string; reason?: string }) =>
      apiClient.post<{ cancelled: boolean }>(`/crm/autonomy/holds/${holdId}/cancel`, {
        ...(reason ? { reason } : {}),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.crm.all });
    },
  });
}
