"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type {
  DecisionFilters,
  DecisionPage,
  SwitchesResponse,
} from "@/types/crm/autonomy";

function toParams(filters: DecisionFilters, limit: number, cursor?: string): string {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set("cursor", cursor);

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
  const canView = useCan("crm:autonomy:view");

  return useInfiniteQuery({
    queryKey: queryKeys.crm.autonomyDecisions({ ...filters, limit }),
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      apiClient.get<DecisionPage>(`/crm/autonomy/decisions?${toParams(filters, limit, pageParam)}`),
    getNextPageParam: (lastPage: DecisionPage) => lastPage.pagination.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    // Short, because a manager watching the feed wants to see the system act.
    staleTime: 15_000,
    enabled: canView,
  });
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

  return useMutation({
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
  const canView = useCan("crm:autonomy:view");

  return useQuery({
    queryKey: queryKeys.crm.autonomySwitches(),
    queryFn: () => apiClient.get<SwitchesResponse>("/crm/autonomy/switches"),
    staleTime: 30_000,
    enabled: canView,
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

  return useMutation({
    mutationFn: (input: { kind: string; enabled: boolean; reason?: string }) =>
      apiClient.patch<SwitchesResponse>("/crm/autonomy/switches", input),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.crm.autonomySwitches(), data);
    },
  });
}
