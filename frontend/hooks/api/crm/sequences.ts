"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useGatedQuery } from "@/hooks/api/gated-query";
import type {
  CrmSequence,
  CrmSequenceStep,
  CrmSequenceEnrollment,
  SequenceStepType,
} from "@/types/crm";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { lazyContract } from "@/lib/api-envelope";

const sequencesListLazy = lazyContract(() => import("@/hooks/api/crm/sequences-schema").then((m) => m.sequencesListContract));
const sequenceLazy = lazyContract(() => import("@/hooks/api/crm/sequences-schema").then((m) => m.sequenceContract));
const stepsListLazy = lazyContract(() => import("@/hooks/api/crm/sequences-schema").then((m) => m.stepsListContract));
const stepLazy = lazyContract(() => import("@/hooks/api/crm/sequences-schema").then((m) => m.stepContract));
const enrollmentsListLazy = lazyContract(() => import("@/hooks/api/crm/sequences-schema").then((m) => m.enrollmentsListContract));
const enrollmentLazy = lazyContract(() => import("@/hooks/api/crm/sequences-schema").then((m) => m.enrollmentContract));
const deleteSequenceLazy = lazyContract(() => import("@/hooks/api/crm/sequences-schema").then((m) => m.deleteSequenceContract));


interface SequencesResponse {
  sequences: CrmSequence[];
}

interface StepsResponse {
  steps: CrmSequenceStep[];
}

interface EnrollmentsResponse {
  enrollments: CrmSequenceEnrollment[];
}

export function useCrmSequences() {
  return useGatedQuery("crm:sequences:manage", {
    queryKey: queryKeys.crmSequences.list(),
    queryFn: ({ signal }) => apiClient.get<SequencesResponse>("/crm/sequences", undefined, signal, sequencesListLazy),
    staleTime: 2 * 60_000,
  });
}

export function useCreateCrmSequence() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:sequences:manage", {
    mutationKey: ["crm", "sequences", "create"],
    mutationFn: (input: {
      name: string;
      description?: string;
      entityType: string;
      isActive?: boolean;
    }) => apiClient.post<CrmSequence>("/crm/sequences", input, undefined, sequenceLazy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmSequences.all });
    },
  });
}

/** Writable fields only — mirrors the backend `updateSequenceSchema`, which is
 * `.strict()`. Deriving this from `Partial<CrmSequence>` would let `id`,
 * `createdAt` and any future read-only field reach the API and be rejected. */
type UpdateSequenceInput = Pick<
  CrmSequence,
  "name" | "description" | "entityType" | "isActive" | "stopOn"
>;

export function useUpdateCrmSequence() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:sequences:manage", {
    mutationKey: ["crm", "sequences", "update"],
    mutationFn: ({ id, ...data }: { id: string } & Partial<UpdateSequenceInput>) =>
      apiClient.patch<CrmSequence>(`/crm/sequences/${id}`, data, undefined, sequenceLazy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmSequences.all });
    },
  });
}

export function useDeleteCrmSequence() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:sequences:manage", {
    mutationKey: ["crm", "sequences", "delete"],
    mutationFn: (id: string) => apiClient.delete<{ success: boolean }>(`/crm/sequences/${id}`, undefined, undefined, deleteSequenceLazy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmSequences.all });
    },
  });
}

export function useCrmSequenceSteps(sequenceId: string) {
  return useGatedQuery("crm:sequences:manage", {
    queryKey: queryKeys.crmSequences.steps(sequenceId),
    queryFn: ({ signal }) => apiClient.get<StepsResponse>(`/crm/sequences/${sequenceId}/steps`, undefined, signal, stepsListLazy),
    enabled: !!sequenceId,
    staleTime: 60_000,
  });
}

export function useCreateCrmSequenceStep(sequenceId: string) {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:sequences:manage", {
    mutationKey: ["crm", "sequences", "steps", "create", sequenceId],
    mutationFn: (input: { stepType: SequenceStepType; waitHours?: number }) =>
      apiClient.post<CrmSequenceStep>(`/crm/sequences/${sequenceId}/steps`, input, undefined, stepLazy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmSequences.steps(sequenceId) });
    },
  });
}

export function useDeleteCrmSequenceStep(sequenceId: string) {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:sequences:manage", {
    mutationKey: ["crm", "sequences", "steps", "delete", sequenceId],
    mutationFn: (stepId: string) =>
      apiClient.delete<{ success: boolean }>(`/crm/sequences/${sequenceId}/steps/${stepId}`, undefined, undefined, deleteSequenceLazy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmSequences.steps(sequenceId) });
    },
  });
}

export function useCrmSequenceEnrollments(sequenceId: string, page: number) {
  return useGatedQuery("crm:sequences:manage", {
    queryKey: queryKeys.crmSequences.enrollments(sequenceId, page),
    queryFn: ({ signal }) =>
      apiClient.get<EnrollmentsResponse>(`/crm/sequences/${sequenceId}/enrollments`, { page }, signal, enrollmentsListLazy),
    enabled: !!sequenceId,
    staleTime: 30_000,
  });
}

export function useStopEnrollment(sequenceId: string) {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:sequences:manage", {
    mutationKey: ["crm", "sequences", "stop-enrollment", sequenceId],
    mutationFn: (enrollmentId: string) =>
      apiClient.patch<CrmSequenceEnrollment>(
        `/crm/sequences/${sequenceId}/enrollments/${enrollmentId}/stop`,
        {},
        undefined,
        enrollmentLazy,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmSequences.all });
    },
  });
}
