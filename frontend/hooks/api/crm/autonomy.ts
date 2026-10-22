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
    params.set(key, String(value));
  }

  return params.toString();
}

export function useAutonomyDecisions(filters: DecisionFilters = {}, limit = 25) {
  const access = usePermissionGate("crm:autonomy:view");

  return gated(
    useInfiniteQuery({
      queryKey: queryKeys.crm.autonomyDecisions({ ...filters, limit }),
      queryFn: ({ pageParam, signal }) =>
        apiClient.get<DecisionPage>(`/crm/autonomy/decisions?${toParams(filters, limit, pageParam as string | undefined)}`, undefined, signal, decisionsPageLazy),
      getNextPageParam: (lastPage: DecisionPage) => lastPage.pagination.nextCursor ?? undefined,
      initialPageParam: undefined as string | undefined,
      staleTime: 15_000,
      enabled: access.allowed,
    }),
    access,
  );
}

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

export function useRepairPolicies() {
  return useGatedQuery("crm:autonomy:view", {
    queryKey: queryKeys.crm.autonomyRepairPolicies(),
    queryFn: ({ signal }) =>
      apiClient.get<RepairPoliciesResponse>("/crm/autonomy/repair-policies", undefined, signal),
    staleTime: 30_000,
  });
}

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

export function useRepairMeasure(days = 30) {
  return useGatedQuery("crm:autonomy:view", {
    queryKey: queryKeys.crm.autonomyRepairMeasure(days),
    queryFn: ({ signal }) =>
      apiClient.get<RepairMeasure>(`/crm/autonomy/repair-measure?days=${days}`, undefined, signal),
    staleTime: 60_000,
  });
}

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

export function useAutonomyScoreboard(days = 30) {
  return useGatedQuery("crm:autonomy:view", {
    queryKey: queryKeys.crm.autonomyScoreboard(days),
    queryFn: ({ signal }) => apiClient.get<Scoreboard>(`/crm/autonomy/scoreboard?days=${days}`, undefined, signal, scoreboardLazy),
    staleTime: 60_000,
  });
}

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

export function useLiveHolds() {
  return useGatedQuery("crm:autonomy:view", {
    queryKey: queryKeys.crm.autonomyHolds(),
    queryFn: ({ signal }) => apiClient.get<LiveHold[]>("/crm/autonomy/holds", undefined, signal, liveHoldsLazy),
    refetchInterval: 10_000,
    staleTime: 0,
  });
}

export function useLiveClassStops() {
  return useGatedQuery("crm:autonomy:view", {
    queryKey: queryKeys.crm.autonomyClassStops(),
    queryFn: ({ signal }) =>
      apiClient.get<LiveClassStop[]>("/crm/autonomy/class-stops", undefined, signal),
    staleTime: 30_000,
  });
}

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
      void queryClient.invalidateQueries({ queryKey: queryKeys.crm.autonomyDecisionsAll() });
      if (outcome.held)
        void queryClient.invalidateQueries({ queryKey: queryKeys.crm.autonomyHolds() });
    },
  });
}
