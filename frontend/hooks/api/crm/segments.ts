"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useGatedQuery } from "@/hooks/api/gated-query";
import type {
  CreateSegmentInput,
  Segment,
  SegmentMembers,
  SegmentPreviewInput,
  SegmentPreviewResult,
  SegmentSource,
  SegmentSummary,
  UpdateSegmentInput,
} from "@/types/crm/segments";

/**
 * `crm/segments`, as Query hooks.
 *
 * Two keys, and the split is the controller's, restated here so a hook cannot
 * quietly gate on the wrong one. `crm:segments:view` reads the list, one
 * segment, the criteria vocabulary and — this is the part that differs from
 * reporting — *evaluates*. There is no third key for running one, because a
 * segment's shape is fixed by the server: a capped sample and one count. Reading
 * a segment and evaluating it are the same act, so gating them apart would
 * produce a grant that shows somebody a segment they can never open.
 *
 * `crm:segments:manage` authors.
 *
 * Neither reaches the rows on its own. Every evaluation also needs the key that
 * governs those rows elsewhere — `party:parties:view` for parties — checked on
 * the server, because the source is known only after the body or the stored row
 * is read. A caller holding the segment key and not the party key gets a 403
 * with the missing key named in it, which is what `getErrorMessage` surfaces.
 */

/** Reference data: one answer per tenant, and it changes when the platform ships one. */
const SOURCES_STALE_MS = 30 * 60_000;
/** A saved definition. Standard entity. */
const SEGMENTS_STALE_MS = 60_000;
/**
 * An evaluation.
 *
 * Short, and deliberately not zero. The whole point of a segment is that it is
 * re-evaluated rather than remembered, so a stale window measured in minutes
 * would reintroduce the staleness the server design removes — just in a
 * different cache. Fifteen seconds is the platform's volatile tier: long enough
 * that opening two panels does not run the query twice, short enough that a
 * change made on the parties screen shows up on the next glance.
 */
const EVALUATION_STALE_MS = 15_000;

export function useSegmentSources() {
  return useGatedQuery("crm:segments:view", {
    queryKey: queryKeys.crm.segmentSources(),
    queryFn: () => apiClient.get<SegmentSource[]>("/crm/segments/sources"),
    staleTime: SOURCES_STALE_MS,
  });
}

export function useSegments(params: { limit: number; offset: number }) {
  return useGatedQuery("crm:segments:view", {
    queryKey: queryKeys.crm.segments(params),
    queryFn: () => apiClient.get<SegmentSummary[]>("/crm/segments", params),
    staleTime: SEGMENTS_STALE_MS,
  });
}

export function useSegment(segmentId: string | null) {
  return useGatedQuery("crm:segments:view", {
    queryKey: queryKeys.crm.segment(segmentId ?? ""),
    queryFn: () => apiClient.get<Segment>(`/crm/segments/${segmentId}`),
    enabled: segmentId !== null,
    staleTime: SEGMENTS_STALE_MS,
  });
}

/**
 * Who is in a segment, evaluated on the server at the moment of the call.
 *
 * `limit` bounds the sample and never the count: the response carries the exact
 * `total` beside the rows, so a segment of forty thousand reports forty thousand
 * and shows a hundred. There is no page argument because no source publishes a
 * row identifier, so there is no unique ordering to page on.
 */
export function useSegmentMembers(segmentId: string | null, limit: number) {
  return useGatedQuery("crm:segments:view", {
    queryKey: queryKeys.crm.segmentMembers(segmentId ?? "", limit),
    queryFn: () =>
      apiClient.get<SegmentMembers>(`/crm/segments/${segmentId}/members`, { limit }),
    enabled: segmentId !== null,
    staleTime: EVALUATION_STALE_MS,
  });
}

/**
 * How many rows criteria match, before anybody names them.
 *
 * A POST because a criteria tree does not fit in a query string, and still a
 * query rather than a mutation: it stores nothing, and re-asking the same
 * question is exactly what a cache is for. Keyed on the whole tree, so editing a
 * value asks a new question instead of reusing the old answer.
 */
export function useSegmentPreview(input: SegmentPreviewInput | null) {
  return useGatedQuery("crm:segments:view", {
    queryKey: queryKeys.crm.segmentPreview(input?.source ?? "", input?.criteria ?? null),
    queryFn: () => apiClient.post<SegmentPreviewResult>("/crm/segments/preview", input),
    enabled: input !== null,
    staleTime: EVALUATION_STALE_MS,
  });
}

/**
 * One invalidation for every read a mutation moves.
 *
 * `segmentsSaved()` is a true prefix of the list, the detail and the members
 * read, and of nothing else — the source catalogue and the unsaved preview sit
 * outside it deliberately, so a save does not refetch a thirty-minute catalogue
 * that cannot have changed.
 */
function useSegmentsInvalidate() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.crm.segmentsSaved() });
  };
}

export function useCreateSegment() {
  const invalidate = useSegmentsInvalidate();

  return useMutation({
    mutationKey: ["crm", "segments", "create"],
    mutationFn: (input: CreateSegmentInput) =>
      apiClient.post<Segment>("/crm/segments", input),
    onSuccess: invalidate,
  });
}

export function useUpdateSegment() {
  const invalidate = useSegmentsInvalidate();

  return useMutation({
    mutationKey: ["crm", "segments", "update"],
    mutationFn: ({
      segmentId,
      ...input
    }: UpdateSegmentInput & { segmentId: string }) =>
      apiClient.patch<Segment>(`/crm/segments/${segmentId}`, input),
    onSuccess: invalidate,
  });
}

export function useDeleteSegment() {
  const invalidate = useSegmentsInvalidate();

  return useMutation({
    mutationKey: ["crm", "segments", "delete"],
    mutationFn: ({ segmentId }: { segmentId: string }) =>
      apiClient.delete<{ deleted: boolean }>(`/crm/segments/${segmentId}`),
    onSuccess: invalidate,
  });
}
