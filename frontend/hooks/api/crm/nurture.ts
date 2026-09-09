"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { usePermissionGate } from "@/hooks/api/access";
import { gated, useGatedQuery } from "@/hooks/api/gated-query";
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

const ROOT = "/crm/autonomy/nurture/sequences";

/**
 * Every read is `crm:autonomy:view` and every write `crm:autonomy:manage`,
 * which is what `NurtureSequencesController` declares on all nine handlers.
 * Enrolling somebody schedules autonomous messages, so it sits under the same
 * key that governs turning the autonomy switches on.
 */
const VIEW = "crm:autonomy:view";

function toParams(limit: number, status?: string, cursor?: string): string {
  const params = new URLSearchParams({ limit: String(limit) });
  if (status) params.set("status", status);
  if (cursor) params.set("cursor", cursor);
  return params.toString();
}

/**
 * The cadences, newest first.
 *
 * Cursor-paginated rather than offset because the list is keyset-ordered on the
 * server: a sequence created while somebody is on page two would shift every
 * row down and silently repeat one. `useInfiniteQuery` rather than
 * `useGatedQuery` for that reason alone — the permission gate is the same one,
 * composed through `gated` so the screen can still tell "denied" from "none".
 */
export function useNurtureSequences(
  filters: { status?: NurtureSequenceStatus } = {},
  limit = 25,
) {
  const access = usePermissionGate(VIEW);

  return gated(
    useInfiniteQuery({
      queryKey: queryKeys.crm.autonomyNurtureSequences({ ...filters, limit }),
      queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
        apiClient.get<NurtureCursorPage<NurtureSequenceSummary>>(
          `${ROOT}?${toParams(limit, filters.status, pageParam)}`,
        ),
      getNextPageParam: (last: NurtureCursorPage<NurtureSequenceSummary>) =>
        last.pagination.nextCursor ?? undefined,
      initialPageParam: undefined as string | undefined,
      staleTime: 30_000,
      enabled: access.allowed,
    }),
    access,
  );
}

export function useNurtureSequence(nurtureSequenceId: string) {
  return useGatedQuery(VIEW, {
    queryKey: queryKeys.crm.autonomyNurtureSequence(nurtureSequenceId),
    queryFn: () =>
      apiClient.get<NurtureSequenceDetail>(`${ROOT}/${nurtureSequenceId}`),
    staleTime: 30_000,
    enabled: nurtureSequenceId.length > 0,
  });
}

/**
 * Who is in one, including everybody who has left.
 *
 * `status` is left unset by default to match the server's own default: a
 * sequence nobody is enrolled in any more and one nobody was ever enrolled in
 * look identical from an active-only list, and the exit reasons are the point.
 */
export function useNurtureEnrollments(
  nurtureSequenceId: string,
  filters: { status?: NurtureEnrollmentStatus } = {},
  limit = 25,
) {
  const access = usePermissionGate(VIEW);

  return gated(
    useInfiniteQuery({
      queryKey: queryKeys.crm.autonomyNurtureEnrollments(nurtureSequenceId, {
        ...filters,
        limit,
      }),
      queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
        apiClient.get<NurtureCursorPage<NurtureEnrollment>>(
          `${ROOT}/${nurtureSequenceId}/enrollments?${toParams(limit, filters.status, pageParam)}`,
        ),
      getNextPageParam: (last: NurtureCursorPage<NurtureEnrollment>) =>
        last.pagination.nextCursor ?? undefined,
      initialPageParam: undefined as string | undefined,
      staleTime: 15_000,
      enabled: access.allowed && nurtureSequenceId.length > 0,
    }),
    access,
  );
}

/**
 * One invalidation for every write.
 *
 * `stepCount` lives on the list row, activation depends on the step count, and
 * deleting a sequence exits its enrolments — so no write here changes exactly
 * one of the three reads. Invalidating the shared prefix is both correct and
 * cheaper to reason about than three call-site lists that drift apart.
 */
function useNurtureInvalidate() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: queryKeys.crm.autonomyNurture() });
}

export function useCreateNurtureSequence() {
  const invalidate = useNurtureInvalidate();

  return useMutation({
    mutationKey: ["crm", "autonomy", "nurture", "sequences", "create"],
    mutationFn: (input: CreateNurtureSequenceInput) =>
      apiClient.post<NurtureSequenceSummary>(ROOT, input),
    onSuccess: invalidate,
  });
}

export function useUpdateNurtureSequence() {
  const invalidate = useNurtureInvalidate();

  return useMutation({
    mutationKey: ["crm", "autonomy", "nurture", "sequences", "update"],
    mutationFn: ({
      nurtureSequenceId,
      ...input
    }: UpdateNurtureSequenceInput & { nurtureSequenceId: string }) =>
      apiClient.patch<NurtureSequenceSummary>(`${ROOT}/${nurtureSequenceId}`, input),
    onSuccess: invalidate,
  });
}

/** Soft delete on the server, and it lets go of everybody it was holding. */
export function useDeleteNurtureSequence() {
  const invalidate = useNurtureInvalidate();

  return useMutation({
    mutationKey: ["crm", "autonomy", "nurture", "sequences", "delete"],
    mutationFn: (nurtureSequenceId: string) =>
      apiClient.delete<NurtureSequenceRemoved>(`${ROOT}/${nurtureSequenceId}`),
    onSuccess: invalidate,
  });
}

/**
 * The whole cadence at once.
 *
 * `PUT`, because step numbers have to be dense and a per-step edit cannot
 * promise that without a read-modify-write two editors would interleave into a
 * gap — which makes the sender fire two messages back to back.
 */
export function useReplaceNurtureSteps() {
  const invalidate = useNurtureInvalidate();

  return useMutation({
    mutationKey: ["crm", "autonomy", "nurture", "steps", "replace"],
    mutationFn: ({
      nurtureSequenceId,
      ...input
    }: ReplaceNurtureStepsInput & { nurtureSequenceId: string }) =>
      apiClient.put<NurtureStep[]>(`${ROOT}/${nurtureSequenceId}/steps`, input),
    onSuccess: invalidate,
  });
}

export function useEnrolInNurtureSequence() {
  const invalidate = useNurtureInvalidate();

  return useMutation({
    mutationKey: ["crm", "autonomy", "nurture", "enrollments", "create"],
    mutationFn: ({
      nurtureSequenceId,
      ...input
    }: EnrolInNurtureSequenceInput & { nurtureSequenceId: string }) =>
      apiClient.post<NurtureEnrollment>(`${ROOT}/${nurtureSequenceId}/enrollments`, input),
    onSuccess: invalidate,
  });
}

/** Recorded as `manual-stop`, and only ever on an enrolment still running. */
export function useUnenrolFromNurtureSequence() {
  const invalidate = useNurtureInvalidate();

  return useMutation({
    mutationKey: ["crm", "autonomy", "nurture", "enrollments", "delete"],
    mutationFn: ({
      nurtureSequenceId,
      nurtureEnrollmentId,
    }: {
      nurtureSequenceId: string;
      nurtureEnrollmentId: string;
    }) =>
      apiClient.delete<NurtureEnrollment>(
        `${ROOT}/${nurtureSequenceId}/enrollments/${nurtureEnrollmentId}`,
      ),
    onSuccess: invalidate,
  });
}
