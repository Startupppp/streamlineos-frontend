"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
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


const SOURCES_STALE_MS = 30 * 60_000;
const SEGMENTS_STALE_MS = 60_000;
const EVALUATION_STALE_MS = 15_000;

export function useSegmentSources() {
  return useGatedQuery("crm:segments:view", {
    queryKey: queryKeys.crm.segmentSources(),
    queryFn: ({ signal }) =>
      apiClient.get<SegmentSource[]>("/crm/segments/sources", undefined, signal),
    staleTime: SOURCES_STALE_MS,
  });
}

export function useSegments(params: { limit: number; offset: number }) {
  return useGatedQuery("crm:segments:view", {
    queryKey: queryKeys.crm.segments(params),
    queryFn: ({ signal }) => apiClient.get<SegmentSummary[]>("/crm/segments", params, signal),
    staleTime: SEGMENTS_STALE_MS,
  });
}

export function useSegment(segmentId: string | null) {
  return useGatedQuery("crm:segments:view", {
    queryKey: queryKeys.crm.segment(segmentId ?? ""),
    queryFn: ({ signal }) =>
      apiClient.get<Segment>(`/crm/segments/${segmentId}`, undefined, signal),
    enabled: segmentId !== null,
    staleTime: SEGMENTS_STALE_MS,
  });
}

export function useSegmentMembers(segmentId: string | null, limit: number) {
  return useGatedQuery("crm:segments:view", {
    queryKey: queryKeys.crm.segmentMembers(segmentId ?? "", limit),
    queryFn: ({ signal }) =>
      apiClient.get<SegmentMembers>(`/crm/segments/${segmentId}/members`, { limit }, signal),
    enabled: segmentId !== null,
    staleTime: EVALUATION_STALE_MS,
  });
}

export function useSegmentPreview(input: SegmentPreviewInput | null) {
  return useGatedQuery("crm:segments:view", {
    queryKey: queryKeys.crm.segmentPreview(input?.source ?? "", input?.criteria ?? null),
    queryFn: ({ signal }) =>
      apiClient.post<SegmentPreviewResult>("/crm/segments/preview", input, { signal }),
    enabled: input !== null,
    staleTime: EVALUATION_STALE_MS,
  });
}

function useSegmentsInvalidate() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.crm.segmentsSaved() });
  };
}

export function useCreateSegment() {
  const invalidate = useSegmentsInvalidate();

  return useAuthorizedMutation("crm:segments:manage", {
    mutationKey: ["crm", "segments", "create"],
    mutationFn: (input: CreateSegmentInput) =>
      apiClient.post<Segment>("/crm/segments", input),
    onSuccess: invalidate,
  });
}

export function useUpdateSegment() {
  const invalidate = useSegmentsInvalidate();

  return useAuthorizedMutation("crm:segments:manage", {
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

  return useAuthorizedMutation("crm:segments:manage", {
    mutationKey: ["crm", "segments", "delete"],
    mutationFn: ({ segmentId }: { segmentId: string }) =>
      apiClient.delete<{ deleted: boolean }>(`/crm/segments/${segmentId}`),
    onSuccess: invalidate,
  });
}
