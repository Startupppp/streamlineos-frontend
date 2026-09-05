"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { growthAndSignQueryKeys } from "@/lib/query-keys/growth-and-sign";
import type { SignField, SignFieldType } from "@/types/sign";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export interface CreateSignFieldInput {
  documentId: number;
  recipientId: number;
  fieldType: SignFieldType;
  label?: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  required?: boolean;
  readonly?: boolean;
  orderIndex?: number;
  groupId?: string;
  defaultValue?: string;
  optionsJson?: string[];
}

function invalidateEnvelope(qc: ReturnType<typeof useQueryClient>, envelopeId: number) {
  qc.invalidateQueries({ queryKey: growthAndSignQueryKeys.signEnvelopes.detail(envelopeId) });
}

export function useAddSignField(envelopeId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("sign:envelope:create", {
    mutationKey: ["signFields", "add", envelopeId],
    mutationFn: (input: CreateSignFieldInput) => apiClient.post<SignField>(`/sign/envelopes/${envelopeId}/fields`, input),
    onSuccess: () => invalidateEnvelope(qc, envelopeId),
  });
}

export function useUpdateSignField(envelopeId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("sign:envelope:create", {
    mutationKey: ["signFields", "update", envelopeId],
    mutationFn: ({ id, input }: { id: number; input: Partial<Omit<CreateSignFieldInput, "documentId" | "recipientId">> }) =>
      apiClient.patch<SignField>(`/sign/fields/${id}`, input),
    onSuccess: () => invalidateEnvelope(qc, envelopeId),
  });
}

export function useDeleteSignField(envelopeId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("sign:envelope:create", {
    mutationKey: ["signFields", "delete", envelopeId],
    mutationFn: (id: number) => apiClient.delete<{ success: true }>(`/sign/fields/${id}`),
    onSuccess: () => invalidateEnvelope(qc, envelopeId),
  });
}
