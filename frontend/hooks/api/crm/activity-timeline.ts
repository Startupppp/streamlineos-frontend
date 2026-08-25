"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type {
  ActivityParticipant,
  CreateActivityInput,
  TimelineAnchor,
  TimelinePage,
} from "@/types/crm/activities";

/** The anchor as the API takes it — exactly one identifier. */
function anchorParams(anchor: TimelineAnchor): Record<string, string> {
  switch (anchor.kind) {
    case "party":
      return { partyId: anchor.partyId };
    case "deal":
      return { dealId: anchor.dealId };
    case "subject":
      return { subjectId: anchor.subjectId };
  }
}

/**
 * One timeline hook for every anchor.
 *
 * Cursor-paginated rather than offset: a timeline grows at the top, and an
 * offset page-2 request after three new emails arrive silently repeats rows.
 */
export function useActivityTimeline(anchor: TimelineAnchor | null, limit = 25) {
  const canView = useCan("crm:activities:view");
  const params = anchor ? anchorParams(anchor) : {};

  return useInfiniteQuery({
    queryKey: queryKeys.crm.activityTimeline({ ...params, limit }),
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      apiClient.get<TimelinePage>(
        `/crm/activities/timeline?${new URLSearchParams({
          ...params,
          limit: String(limit),
          ...(pageParam ? { cursor: pageParam } : {}),
        }).toString()}`,
      ),
    getNextPageParam: (lastPage: TimelinePage) => lastPage.pagination.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    staleTime: 30_000,
    enabled: canView && !!anchor,
  });
}

export function useMyActivityTasks(includeCompleted = false, limit = 25) {
  const canView = useCan("crm:activities:view");

  return useInfiniteQuery({
    queryKey: queryKeys.crm.myActivityTasks({ includeCompleted, limit }),
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      apiClient.get<TimelinePage>(
        `/crm/activities/my-tasks?${new URLSearchParams({
          includeCompleted: String(includeCompleted),
          limit: String(limit),
          ...(pageParam ? { cursor: pageParam } : {}),
        }).toString()}`,
      ),
    getNextPageParam: (lastPage: TimelinePage) => lastPage.pagination.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    staleTime: 30_000,
    enabled: canView,
  });
}

export function useActivityParticipants(activityId: string | null) {
  const canView = useCan("crm:activities:view");

  return useQuery({
    queryKey: queryKeys.crm.activityParticipants(activityId ?? ""),
    queryFn: () =>
      apiClient.get<{ data: ActivityParticipant[] }>(
        `/crm/activities/${activityId}/participants`,
      ),
    staleTime: 60_000,
    enabled: canView && !!activityId,
  });
}

export function useLogActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crm", "activities", "create"],
    mutationFn: (input: CreateActivityInput) => apiClient.post("/crm/activities", input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.crm.all });
    },
  });
}

export function useCompleteActivityTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crm", "activities", "complete"],
    mutationFn: (activityId: string) =>
      apiClient.post(`/crm/activities/${activityId}/complete`, {}),
    onSuccess: () => {
      // The same row appears on a timeline and in the person's own task list.
      void qc.invalidateQueries({ queryKey: queryKeys.crm.all });
    },
  });
}
