"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type {
  CrmSequence,
  CrmSequenceStep,
  CrmSequenceEnrollment,
  SequenceStepType,
} from "@/types/crm";

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
  const canManage = useCan("crm:sequences:manage");
  return useQuery({
    queryKey: queryKeys.crmSequences.list(),
    queryFn: () => apiClient.get<SequencesResponse>("/crm/sequences"),
    staleTime: 2 * 60_000,
    enabled: canManage,
  });
}

export function useCreateCrmSequence() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crm", "sequences", "create"],
    mutationFn: (input: {
      name: string;
      description?: string;
      entityType: string;
      isActive?: boolean;
    }) => apiClient.post<CrmSequence>("/crm/sequences", input),
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
  return useMutation({
    mutationKey: ["crm", "sequences", "update"],
    mutationFn: ({ id, ...data }: { id: string } & Partial<UpdateSequenceInput>) =>
      apiClient.patch<CrmSequence>(`/crm/sequences/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmSequences.all });
    },
  });
}

export function useDeleteCrmSequence() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crm", "sequences", "delete"],
    mutationFn: (id: string) => apiClient.delete<{ success: boolean }>(`/crm/sequences/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmSequences.all });
    },
  });
}

export function useCrmSequenceSteps(sequenceId: string) {
  const canManage = useCan("crm:sequences:manage");
  return useQuery({
    queryKey: queryKeys.crmSequences.steps(sequenceId),
    queryFn: () => apiClient.get<StepsResponse>(`/crm/sequences/${sequenceId}/steps`),
    enabled: canManage && !!sequenceId,
    staleTime: 60_000,
  });
}

export function useCreateCrmSequenceStep(sequenceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crm", "sequences", "steps", "create", sequenceId],
    mutationFn: (input: { stepType: SequenceStepType; waitHours?: number }) =>
      apiClient.post<CrmSequenceStep>(`/crm/sequences/${sequenceId}/steps`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmSequences.steps(sequenceId) });
    },
  });
}

export function useDeleteCrmSequenceStep(sequenceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crm", "sequences", "steps", "delete", sequenceId],
    mutationFn: (stepId: string) =>
      apiClient.delete<{ success: boolean }>(`/crm/sequences/${sequenceId}/steps/${stepId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmSequences.steps(sequenceId) });
    },
  });
}

export function useCrmSequenceEnrollments(sequenceId: string, page: number) {
  const canManage = useCan("crm:sequences:manage");
  return useQuery({
    queryKey: queryKeys.crmSequences.enrollments(sequenceId, page),
    queryFn: () =>
      apiClient.get<EnrollmentsResponse>(`/crm/sequences/${sequenceId}/enrollments`, { page }),
    enabled: canManage && !!sequenceId,
    staleTime: 30_000,
  });
}

export function useStopEnrollment(sequenceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crm", "sequences", "stop-enrollment", sequenceId],
    mutationFn: (enrollmentId: string) =>
      apiClient.patch<CrmSequenceEnrollment>(
        `/crm/sequences/${sequenceId}/enrollments/${enrollmentId}/stop`,
        {},
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmSequences.all });
    },
  });
}
