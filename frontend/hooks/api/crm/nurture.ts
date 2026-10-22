"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { usePermissionGate } from "@/hooks/api/access";
import { gated, useGatedQuery } from "@/hooks/api/gated-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useAuthorizedIdempotentMutation } from "@/hooks/api/inventory/use-idempotent-mutation";
import type {
  CreateNurtureSequenceInput,
  EnrolInNurtureSequenceInput,
  NurtureCursorPage,
  NurtureEnrollment,
  NurtureEnrollmentStatus,
  NurtureSequenceDetail,
  NurtureSequenceRemoved,
  NurtureSequenceStatus,
  NurtureSequenceSummary,
  NurtureStep,
  ReplaceNurtureStepsInput,
  UpdateNurtureSequenceInput,
} from "@/types/crm/nurture";

const FIRST_PAGE: string | undefined = undefined;

function toParams(limit: number, status?: string, cursor?: string): string {
  const params = new URLSearchParams({ limit: String(limit) });
  if (status) params.set("status", status);
  if (cursor) params.set("cursor", cursor);
  return params.toString();
}

export function useNurtureSequences(
  filters: { status?: NurtureSequenceStatus } = {},
  limit = 25,
) {
  const access = usePermissionGate("crm:autonomy:view");

  return gated(
    useInfiniteQuery({
      queryKey: queryKeys.crm.autonomyNurtureSequences({ ...filters, limit }),
      queryFn: ({ pageParam, signal }) =>
        apiClient.get<NurtureCursorPage<NurtureSequenceSummary>>(
          `/crm/autonomy/nurture/sequences?${toParams(limit, filters.status, pageParam)}`,
          undefined,
          signal,
        ),
      getNextPageParam: (last: NurtureCursorPage<NurtureSequenceSummary>) =>
        last.pagination.nextCursor ?? undefined,
      initialPageParam: FIRST_PAGE,
      staleTime: 30_000,
      enabled: access.allowed,
    }),
    access,
  );
}

export function useNurtureSequence(nurtureSequenceId: string) {
  return useGatedQuery("crm:autonomy:view", {
    queryKey: queryKeys.crm.autonomyNurtureSequence(nurtureSequenceId),
    queryFn: ({ signal }) =>
      apiClient.get<NurtureSequenceDetail>(
        `/crm/autonomy/nurture/sequences/${nurtureSequenceId}`,
        undefined,
        signal,
      ),
    staleTime: 30_000,
    enabled: nurtureSequenceId.length > 0,
  });
}

export function useNurtureEnrollments(
  nurtureSequenceId: string,
  filters: { status?: NurtureEnrollmentStatus } = {},
  limit = 25,
) {
  const access = usePermissionGate("crm:autonomy:view");

  return gated(
    useInfiniteQuery({
      queryKey: queryKeys.crm.autonomyNurtureEnrollments(nurtureSequenceId, {
        ...filters,
        limit,
      }),
      queryFn: ({ pageParam, signal }) =>
        apiClient.get<NurtureCursorPage<NurtureEnrollment>>(
          `/crm/autonomy/nurture/sequences/${nurtureSequenceId}/enrollments?${toParams(limit, filters.status, pageParam)}`,
          undefined,
          signal,
        ),
      getNextPageParam: (last: NurtureCursorPage<NurtureEnrollment>) =>
        last.pagination.nextCursor ?? undefined,
      initialPageParam: FIRST_PAGE,
      staleTime: 15_000,
      enabled: access.allowed && nurtureSequenceId.length > 0,
    }),
    access,
  );
}

function useNurtureInvalidate() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: queryKeys.crm.autonomyNurture() });
}

export function useCreateNurtureSequence() {
  const invalidate = useNurtureInvalidate();

  return useAuthorizedIdempotentMutation<
    NurtureSequenceSummary,
    Error,
    CreateNurtureSequenceInput
  >("crm:autonomy:manage", {
    mutationKey: ["crm", "autonomy", "nurture", "sequences", "create"],
    mutationFn: (input, idempotencyKey) =>
      apiClient.post<NurtureSequenceSummary>("/crm/autonomy/nurture/sequences", input, {
        headers: { "Idempotency-Key": idempotencyKey },
      }),
    onSuccess: invalidate,
  });
}

export function useUpdateNurtureSequence() {
  const invalidate = useNurtureInvalidate();

  return useAuthorizedIdempotentMutation<
    NurtureSequenceSummary,
    Error,
    UpdateNurtureSequenceInput & { nurtureSequenceId: string }
  >("crm:autonomy:manage", {
    mutationKey: ["crm", "autonomy", "nurture", "sequences", "update"],
    mutationFn: ({ nurtureSequenceId, ...input }, idempotencyKey) =>
      apiClient.patch<NurtureSequenceSummary>(
        `/crm/autonomy/nurture/sequences/${nurtureSequenceId}`,
        input,
        { headers: { "Idempotency-Key": idempotencyKey } },
      ),
    onSuccess: invalidate,
  });
}

export function useDeleteNurtureSequence() {
  const invalidate = useNurtureInvalidate();

  return useAuthorizedMutation("crm:autonomy:manage", {
    mutationKey: ["crm", "autonomy", "nurture", "sequences", "delete"],
    mutationFn: (nurtureSequenceId: string) =>
      apiClient.delete<NurtureSequenceRemoved>(`/crm/autonomy/nurture/sequences/${nurtureSequenceId}`),
    onSuccess: invalidate,
  });
}

export function useReplaceNurtureSteps() {
  const invalidate = useNurtureInvalidate();

  return useAuthorizedIdempotentMutation<
    NurtureStep[],
    Error,
    ReplaceNurtureStepsInput & { nurtureSequenceId: string }
  >("crm:autonomy:manage", {
    mutationKey: ["crm", "autonomy", "nurture", "steps", "replace"],
    mutationFn: ({ nurtureSequenceId, ...input }, idempotencyKey) =>
      apiClient.put<NurtureStep[]>(
        `/crm/autonomy/nurture/sequences/${nurtureSequenceId}/steps`,
        input,
        { headers: { "Idempotency-Key": idempotencyKey } },
      ),
    onSuccess: invalidate,
  });
}

export function useEnrolInNurtureSequence() {
  const invalidate = useNurtureInvalidate();

  return useAuthorizedIdempotentMutation<
    NurtureEnrollment,
    Error,
    EnrolInNurtureSequenceInput & { nurtureSequenceId: string }
  >("crm:autonomy:manage", {
    mutationKey: ["crm", "autonomy", "nurture", "enrollments", "create"],
    mutationFn: ({ nurtureSequenceId, ...input }, idempotencyKey) =>
      apiClient.post<NurtureEnrollment>(
        `/crm/autonomy/nurture/sequences/${nurtureSequenceId}/enrollments`,
        input,
        { headers: { "Idempotency-Key": idempotencyKey } },
      ),
    onSuccess: invalidate,
  });
}

export function useUnenrolFromNurtureSequence() {
  const invalidate = useNurtureInvalidate();

  return useAuthorizedMutation("crm:autonomy:manage", {
    mutationKey: ["crm", "autonomy", "nurture", "enrollments", "delete"],
    mutationFn: ({
      nurtureSequenceId,
      nurtureEnrollmentId,
    }: {
      nurtureSequenceId: string;
      nurtureEnrollmentId: string;
    }) =>
      apiClient.delete<NurtureEnrollment>(
        `/crm/autonomy/nurture/sequences/${nurtureSequenceId}/enrollments/${nurtureEnrollmentId}`,
      ),
    onSuccess: invalidate,
  });
}
