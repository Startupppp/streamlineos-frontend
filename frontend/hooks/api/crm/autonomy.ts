"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { usePermissionGate } from "@/hooks/api/access";
import { gated, useGatedQuery } from "@/hooks/api/gated-query";
import type {
  AutonomySettings,
  ComposeOutboundInput,
  ComposeOutboundOutcome,
  DecisionFilters,
  DecisionPage,
  AutonomyRepairPage,
  LiveClassStop,
  LiveHold,
  RepairMeasure,
  RepairClass,
  RepairPoliciesResponse,
  ReviewQueueItem,
  Scoreboard,
  SwitchesResponse,
} from "@/types/crm/autonomy";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useAuthorizedIdempotentMutation } from "@/hooks/api/inventory/use-idempotent-mutation";


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
const reverseDecisionLazy = lazyContract(() =>
  import("@/hooks/api/crm/autonomy-schema").then((m) => m.reverseDecisionContract),
);
const markReviewedLazy = lazyContract(() =>
  import("@/hooks/api/crm/autonomy-schema").then((m) => m.markReviewedContract),
);
const cancelHoldLazy = lazyContract(() =>
  import("@/hooks/api/crm/autonomy-schema").then((m) => m.cancelHoldContract),
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
        apiClient.get<DecisionPage>(`/crm/autonomy/decisions?${toParams(filters, limit, pageParam as string | undefined)}`, undefined, signal, decisionsPageLazy),
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
        undefined,
        reverseDecisionLazy,
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
      apiClient.patch<SwitchesResponse>("/crm/autonomy/switches", input, undefined, switchesLazy),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.crm.autonomySwitches(), data);
    },
  });
}

/**
 * Which deterministic repairs this tenant allows the system to make unattended.
 *
 * Read under the view key and written under `crm:autonomy:repair`, matching the
 * two permissions the endpoints themselves carry.
 */
export function useRepairPolicies() {
  return useGatedQuery("crm:autonomy:view", {
    queryKey: queryKeys.crm.autonomyRepairPolicies(),
    queryFn: ({ signal }) =>
      apiClient.get<RepairPoliciesResponse>("/crm/autonomy/repair-policies", undefined, signal),
    staleTime: 30_000,
  });
}

/**
 * Grant one repair class, or take it back.
 *
 * Not optimistic, for the same reason the kill switch is not: this decides
 * whether the product edits a customer's data without being asked, and showing
 * it as off a moment before it is would be a lie in the one place it matters.
 */
export function useSetRepairPolicy() {
  const queryClient = useQueryClient();

  return useAuthorizedIdempotentMutation<
    RepairPoliciesResponse,
    Error,
    { repairClass: RepairClass; enabled: boolean; reason?: string }
  >("crm:autonomy:repair", {
    mutationKey: ["crm", "autonomy", "repair-policies", "set"],
    mutationFn: (input, idempotencyKey) =>
      apiClient.patch<RepairPoliciesResponse>("/crm/autonomy/repair-policies", input, {
        headers: { "Idempotency-Key": idempotencyKey },
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.crm.autonomyRepairPolicies(), data);
    },
  });
}

/**
 * CRM-P1-05. What the repair loop actually changed, most recent first.
 *
 * Read under the review key, matching the endpoint: seeing what the system did
 * to a customer's record is a different authority from letting it, and from
 * taking it back.
 */
export function useRepairs(filters: { limit?: number; revertedOnly?: boolean } = {}) {
  const params = new URLSearchParams();
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.revertedOnly) params.set("revertedOnly", "true");
  const query = params.toString();

  return useGatedQuery("crm:autonomy:view", {
    queryKey: queryKeys.crm.autonomyRepairs(filters),
    queryFn: ({ signal }) =>
      apiClient.get<AutonomyRepairPage>(
        `/crm/autonomy/repairs${query ? `?${query}` : ""}`,
        undefined,
        signal,
      ),
    staleTime: 30_000,
  });
}

/** The loop's own measure, over a window. */
export function useRepairMeasure(days = 30) {
  return useGatedQuery("crm:autonomy:view", {
    queryKey: queryKeys.crm.autonomyRepairMeasure(days),
    queryFn: ({ signal }) =>
      apiClient.get<RepairMeasure>(`/crm/autonomy/repair-measure?days=${days}`, undefined, signal),
    staleTime: 60_000,
  });
}

/**
 * Put one field back the way it was.
 *
 * `crm:autonomy:reverse` on the server, which is not the key that granted the
 * repair — undoing what the system did is deliberately its own authority.
 */
export function useRevertRepair() {
  const queryClient = useQueryClient();

  return useAuthorizedIdempotentMutation<
    { reverted: boolean },
    Error,
    { repairId: string; reason?: string }
  >("crm:autonomy:reverse", {
    mutationKey: ["crm", "autonomy", "repairs", "revert"],
    mutationFn: ({ repairId, reason }, idempotencyKey) =>
      apiClient.post<{ reverted: boolean }>(
        `/crm/autonomy/repairs/${repairId}/revert`,
        { ...(reason ? { reason } : {}) },
        { headers: { "Idempotency-Key": idempotencyKey } },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.crm.all });
    },
  });
}

/** How often the system was right, per action type, over a window. */
export function useAutonomyScoreboard(days = 30) {
  return useGatedQuery("crm:autonomy:view", {
    queryKey: queryKeys.crm.autonomyScoreboard(days),
    queryFn: ({ signal }) => apiClient.get<Scoreboard>(`/crm/autonomy/scoreboard?days=${days}`, undefined, signal, scoreboardLazy),
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
        undefined,
        markReviewedLazy,
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
      apiClient.patch<AutonomySettings>("/crm/autonomy/settings", patch, undefined, autonomySettingsLazy),
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

/**
 * The classes currently stopped for somebody, and who stopped them.
 *
 * Not polled like the holds are. A hold is a countdown measured in seconds; a
 * class stop is open-ended and changes only when a person acts on it, so a
 * ten-second refetch would be asking a question whose answer moves once a week.
 */
export function useLiveClassStops() {
  return useGatedQuery("crm:autonomy:view", {
    queryKey: queryKeys.crm.autonomyClassStops(),
    queryFn: ({ signal }) =>
      apiClient.get<LiveClassStop[]>("/crm/autonomy/class-stops", undefined, signal),
    staleTime: 30_000,
  });
}

/** The stop's only exit. */
export function useReleaseClassStop() {
  const queryClient = useQueryClient();

  return useAuthorizedIdempotentMutation<
    { released: boolean },
    Error,
    { outboundClassStopId: string }
  >("crm:autonomy:manage", {
    mutationKey: ["crm", "autonomy", "class-stops", "release"],
    mutationFn: ({ outboundClassStopId }, idempotencyKey) =>
      apiClient.post<{ released: boolean }>(
        `/crm/autonomy/class-stops/${outboundClassStopId}/release`,
        {},
        { headers: { "Idempotency-Key": idempotencyKey } },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.crm.autonomyClassStops() });
    },
  });
}

export function useCancelHold() {
  const queryClient = useQueryClient();

  return useAuthorizedMutation("crm:autonomy:reverse", {
    mutationKey: ["crm", "autonomy", "holds", "cancel"],
    mutationFn: ({ holdId, reason }: { holdId: string; reason?: string }) =>
      apiClient.post<{ cancelled: boolean }>(`/crm/autonomy/holds/${holdId}/cancel`, {
        ...(reason ? { reason } : {}),
      }, undefined, cancelHoldLazy),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.crm.all });
    },
  });
}

/**
 * `POST /crm/autonomy/outbound` — consider writing to a customer.
 *
 * A mutation rather than a query, and not because it writes a draft. It spends
 * the tenant's AI credits and, when the judge agrees, holds a message that will
 * go out on its own unless somebody stops it. Nothing about that may happen
 * because a component re-rendered.
 *
 * The idempotency key is minted by the caller and travels in the variables, not
 * built here. `@Idempotent` makes the header required, and the API client mints
 * one per *fetch* — so a retried request would carry a new key, replay nothing,
 * pay for a second draft and hold a second, differently worded message to the
 * same person. One press of the button is one key; a deliberate second look an
 * hour later is a new intent and gets a new one.
 */
export function useComposeOutbound() {
  const queryClient = useQueryClient();

  return useAuthorizedMutation("crm:autonomy:manage", {
    mutationKey: ["crm", "autonomy", "outbound", "compose"],
    mutationFn: ({
      intentKey,
      ...input
    }: ComposeOutboundInput & { intentKey: string }) =>
      apiClient.post<ComposeOutboundOutcome>("/crm/autonomy/outbound", input, {
        headers: { "Idempotency-Key": `outbound-compose:${intentKey}` },
      }),
    onSuccess: (outcome) => {
      /*
        A refusal changes the decision ledger and nothing else; a hold also puts
        a countdown on the screen above this one. Invalidating the holds on a
        refusal would refetch a list that cannot have changed.
      */
      void queryClient.invalidateQueries({ queryKey: queryKeys.crm.autonomyDecisionsAll() });
      if (outcome.held)
        void queryClient.invalidateQueries({ queryKey: queryKeys.crm.autonomyHolds() });
    },
  });
}
